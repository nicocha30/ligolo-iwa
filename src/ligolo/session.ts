import type { YamuxStream } from "@chainsafe/libp2p-yamux/stream";
import type { Handshake } from "it-handshake";

import { yamux } from "@chainsafe/libp2p-yamux";
import { defaultLogger } from "@libp2p/logger";
import { pipe } from "it-pipe";
import * as toIterable from "stream-to-it";
import { connect } from "it-ws/client";

import {
  ConnectRequestPacket,
  ConnectResponsePacket,
  InfoReplyPacket,
  LigoloDecoder,
  LigoloEncoder,
  MESSAGE_TYPES,
  NetInterface,
  TRANSPORT_TYPES,
} from "./encdec";
import { createTcpPipe, createUdpPipe } from "./socket";

const component = {
  logger: defaultLogger(),
};

export type SessionLogType = "info" | "error" | "success";

export interface LigoloSessionCallbacks {
  onActiveConnectionsChange(delta: number): void;
  onBytesIn(bytes: number): void;
  onBytesOut(bytes: number): void;
  onConnected(): void;
  onLog(message: string, type?: SessionLogType): void;
  onTotalConnectionsChange(delta: number): void;
}

export interface CreateLigoloSessionOptions extends LigoloSessionCallbacks {
  agentId: string;
  websocketUrl: string;
}

export interface LigoloSession {
  close(): Promise<void>;
  done: Promise<void>;
}

interface ActiveTunnel {
  close(): Promise<void>;
  release(): void;
}

interface TunnelRegistry {
  closeAll(): Promise<void>;
  register(closeTunnel: () => Promise<void>): ActiveTunnel;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function createTunnelRegistry(
  callbacks: Pick<LigoloSessionCallbacks, "onActiveConnectionsChange">,
): TunnelRegistry {
  let nextTunnelId = 0;
  const activeTunnels = new Map<number, () => Promise<void>>();

  return {
    register(closeTunnel) {
      const tunnelId = nextTunnelId;

      nextTunnelId += 1;
      activeTunnels.set(tunnelId, closeTunnel);
      callbacks.onActiveConnectionsChange(1);

      let released = false;

      return {
        close: async () => {
          await closeTunnel();
        },
        release: () => {
          if (released) {
            return;
          }

          released = true;

          if (activeTunnels.delete(tunnelId)) {
            callbacks.onActiveConnectionsChange(-1);
          }
        },
      };
    },
    closeAll: async () => {
      const tunnelsToClose = Array.from(activeTunnels.entries());

      for (const [tunnelId] of tunnelsToClose) {
        if (activeTunnels.delete(tunnelId)) {
          callbacks.onActiveConnectionsChange(-1);
        }
      }

      await Promise.allSettled(
        tunnelsToClose.map(([, closeTunnel]) => closeTunnel()),
      );
    },
  };
}

async function tcpBridge(
  tunnel: Handshake,
  connection: Awaited<ReturnType<typeof createTcpPipe>>,
) {
  const writer = connection.writable.getWriter();

  try {
    for await (const chunk of tunnel.stream.source) {
      await writer.write(chunk.subarray());
    }
  } finally {
    writer.releaseLock();
  }
}

async function udpBridge(
  tunnel: Handshake,
  connection: Awaited<ReturnType<typeof createUdpPipe>>,
) {
  const writer = connection.writable.getWriter();

  try {
    for await (const chunk of tunnel.stream.source) {
      await writer.write(chunk.subarray());
    }
  } finally {
    writer.releaseLock();
  }
}

async function* udpReadableSource(
  connection: Awaited<ReturnType<typeof createUdpPipe>>,
) {
  const reader = connection.readable.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        return;
      }

      yield new Uint8Array(value.data);
    }
  } finally {
    reader.releaseLock();
  }
}

async function finalizeTunnel(
  activeTunnel: ActiveTunnel,
  tunnelFlows: Array<Promise<unknown>>,
) {
  activeTunnel.release();
  await activeTunnel.close();
  await Promise.allSettled(tunnelFlows);
}

async function handleTcpTunnel(
  stream: YamuxStream,
  packet: ConnectRequestPacket,
  callbacks: LigoloSessionCallbacks,
  tunnels: TunnelRegistry,
) {
  const encoder = new LigoloEncoder(stream);
  const target = `${packet.Address}:${packet.Port}`;

  try {
    const connection = await createTcpPipe(packet.Address, packet.Port, 2_000);
    const tunnel = await encoder.encode(new ConnectResponsePacket(true, false));
    const activeTunnel = tunnels.register(async () => {
      await Promise.allSettled([connection.close(), stream.close()]);
    });

    callbacks.onTotalConnectionsChange(1);
    callbacks.onLog(`TCP tunnel opened to ${target}`, "success");

    const tunnelFlows = [
      tcpBridge(tunnel, connection),
      pipe(toIterable.source(connection.readable), tunnel.stream),
    ];

    try {
      await Promise.race(tunnelFlows);
    } finally {
      await finalizeTunnel(activeTunnel, tunnelFlows);
    }

    return;
  } catch (error) {
    callbacks.onLog(
      `Unable to open tunnel to ${target}: ${formatError(error)}`,
      "error",
    );
    await encoder.encode(new ConnectResponsePacket(false, true));
    await stream.close();
  }
}

async function handleUdpTunnel(
  stream: YamuxStream,
  packet: ConnectRequestPacket,
  callbacks: LigoloSessionCallbacks,
  tunnels: TunnelRegistry,
) {
  const encoder = new LigoloEncoder(stream);
  const target = `${packet.Address}:${packet.Port}`;

  try {
    const connection = await createUdpPipe(packet.Address, packet.Port, 2_000);
    const tunnel = await encoder.encode(new ConnectResponsePacket(true, false));
    const activeTunnel = tunnels.register(async () => {
      await Promise.allSettled([connection.close(), stream.close()]);
    });

    callbacks.onTotalConnectionsChange(1);
    callbacks.onLog(`UDP tunnel opened to ${target}`, "success");

    const tunnelFlows = [
      udpBridge(tunnel, connection),
      pipe(udpReadableSource(connection), tunnel.stream),
    ];

    try {
      await Promise.race(tunnelFlows);
    } finally {
      await finalizeTunnel(activeTunnel, tunnelFlows);
    }

    return;
  } catch (error) {
    callbacks.onLog(
      `Unable to open tunnel to ${target}: ${formatError(error)}`,
      "error",
    );
    await encoder.encode(new ConnectResponsePacket(false, true));
    await stream.close();
  }
}

async function handleConnectRequest(
  stream: YamuxStream,
  packet: ConnectRequestPacket,
  callbacks: LigoloSessionCallbacks,
  tunnels: TunnelRegistry,
) {
  const target = `${packet.Address}:${packet.Port}`;

  if (packet.Transport === TRANSPORT_TYPES.TransportTCP) {
    await handleTcpTunnel(stream, packet, callbacks, tunnels);

    return;
  }

  if (packet.Transport === TRANSPORT_TYPES.TransportUDP) {
    await handleUdpTunnel(stream, packet, callbacks, tunnels);

    return;
  }

  callbacks.onLog(
    `Unsupported transport received for ${target}: ${packet.Transport}`,
    "error",
  );

  const encoder = new LigoloEncoder(stream);

  await encoder.encode(new ConnectResponsePacket(false, true));
  await stream.close();
}

async function handleIncomingStream(
  stream: YamuxStream,
  agentId: string,
  callbacks: LigoloSessionCallbacks,
  tunnels: TunnelRegistry,
) {
  const decoder = new LigoloDecoder(stream.source);

  await decoder.decode();

  switch (decoder.payloadType) {
    case MESSAGE_TYPES.MessageInfoRequest: {
      callbacks.onConnected();
      callbacks.onLog("Ligolo info request received", "info");

      const encoder = new LigoloEncoder(stream);
      const netIfs = new NetInterface(0, 1500, "Chrome IWA", "123456", 0, []);
      const infoPacket = new InfoReplyPacket("Ligolo-ng/JS", [netIfs], agentId);

      await encoder.encode(infoPacket);

      return;
    }

    case MESSAGE_TYPES.MessageConnectRequest:
      await handleConnectRequest(
        stream,
        decoder.payload as ConnectRequestPacket,
        callbacks,
        tunnels,
      );

      return;

    default:
      callbacks.onLog(
        `Ignoring unsupported packet type: ${decoder.messageType ?? decoder.payloadType}`,
        "info",
      );
      await stream.close();
  }
}

export async function createLigoloSession({
  agentId,
  websocketUrl,
  ...callbacks
}: CreateLigoloSessionOptions): Promise<LigoloSession> {
  callbacks.onLog(`Connecting to WebSocket: ${websocketUrl}`, "info");

  const webSocketStream = connect(websocketUrl);

  await webSocketStream.connected();
  callbacks.onLog("WebSocket connection established", "success");

  let isShuttingDown = false;
  let closePromise: Promise<void> | null = null;
  let hasConnected = false;

  const tunnels = createTunnelRegistry(callbacks);

  const muxer = yamux({
    maxInboundStreams: 10_000_000,
    maxOutboundStreams: 10_000_000,
    onIncomingStream: async (stream: YamuxStream) => {
      try {
        await handleIncomingStream(
          stream,
          agentId,
          {
            ...callbacks,
            onConnected: () => {
              if (hasConnected) {
                return;
              }

              hasConnected = true;
              callbacks.onConnected();
            },
          },
          tunnels,
        );
      } catch (error) {
        callbacks.onLog(
          `Incoming stream failed: ${formatError(error)}`,
          "error",
        );
        await stream.close();
      }
    },
  })(component);

  const streamMuxer = muxer.createStreamMuxer();

  const shutdown = async () => {
    if (closePromise != null) {
      return closePromise;
    }

    closePromise = Promise.allSettled([
      tunnels.closeAll(),
      streamMuxer.close(),
      webSocketStream.close(),
    ]).then(() => undefined);

    return closePromise;
  };

  const done = (async () => {
    try {
      await pipe(
        webSocketStream,
        async function* trackInbound(source) {
          for await (const chunk of source) {
            callbacks.onBytesIn(chunk.byteLength);
            yield chunk.subarray();
          }
        },
        streamMuxer,
        async function* trackOutbound(source) {
          for await (const chunk of source) {
            callbacks.onBytesOut(chunk.byteLength);
            yield chunk.subarray();
          }
        },
        webSocketStream,
      );
    } catch (error) {
      if (!isShuttingDown) {
        callbacks.onLog(
          `Session closed with error: ${formatError(error)}`,
          "error",
        );
      }
    } finally {
      await shutdown();
    }
  })();

  return {
    close: async () => {
      isShuttingDown = true;
      await shutdown();
      await done;
    },
    done,
  };
}
