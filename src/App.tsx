import React from "react";
import {
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Button,
  Spinner,
  Divider,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { yamux } from "@chainsafe/libp2p-yamux";
import { connect } from "it-ws/client";
import { pipe } from "it-pipe";
import { defaultLogger } from "@libp2p/logger";
import { YamuxStream } from "@chainsafe/libp2p-yamux/stream";
import * as toIterable from "stream-to-it";
import { Handshake } from "it-handshake";
import {v4 as uuidv4} from 'uuid';

import { ThemeSwitcher } from "./components/theme-switcher";
import { ConnectionStatus } from "./components/connection-status";
import { LogDisplay } from "./components/log-display";
import { ConnectionForm } from "./components/connection-form";

import {
  ConnectRequestPacket,
  ConnectResponsePacket,
  InfoReplyPacket,
  LigoloEncoder,
} from "@/ligolo/encdec.ts";
import { LigoloDecoder, MESSAGE_TYPES, NetInterface } from "@/ligolo/encdec.ts";
import { createTcpPipe, createUdpPipe } from "@/ligolo/socket.ts";
import { ConnectionStatistics } from "@/components/connection-stats.tsx";

// Create a logger instance
const component = {
  logger: defaultLogger(),
};

async function tcpBridge(shake: Handshake, connection: TCPSocketOpenInfo) {
  const writer = connection.writable.getWriter();

  for await (const chunk of shake.stream.source) {
    await writer.write(chunk.subarray());
  }
}

async function udpBridge(shake: Handshake, connection: UDPSocketOpenInfo) {
  const writer = connection.writable.getWriter();

  for await (const chunk of shake.stream.source) {
    await writer.write({ data: chunk.subarray() });
  }
}

export default function App() {
  const [isConnected, setIsConnected] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [logs, setLogs] = React.useState<
    Array<{
      timestamp: Date;
      message: string;
      type: "info" | "error" | "success";
    }>
  >([]);
  const [connectionDetails, setConnectionDetails] = React.useState({
    websocketUrl: window.localStorage.getItem("websocketUrl") ?? "ws://localhost:11601",
    agentId: window.localStorage.getItem("agentId") ?? uuidv4(),
  });
  const [stats, setStats] = React.useState({
    activeConnections: 0,
    totalConnections: 0,
    bytesIn: 0,
    bytesOut: 0,
  });

  const addLog = (
    message: string,
    type: "info" | "error" | "success" = "info",
  ) => {
    setLogs((prevLogs) => [
      ...prevLogs,
      { timestamp: new Date(), message, type },
    ]);
  };

  const handleConnect = () => {
    localStorage.setItem("websocketUrl", connectionDetails.websocketUrl);
    localStorage.setItem("agentId", connectionDetails.agentId);
    if (isConnected) {
      // Disconnect logic
      setIsConnecting(true);
      addLog("Disconnecting from agent...", "info");

      setTimeout(() => {
        setIsConnected(false);
        setIsConnecting(false);
        addLog("Disconnected from agent", "info");
      }, 1500);
    } else {
      // Connect logic
      if (!connectionDetails.websocketUrl) {
        addLog("WebSocket URL is required", "error");

        return;
      }

      startLigoloAgent(
        connectionDetails.websocketUrl,
        connectionDetails.agentId,
      );
    }
  };

  const clearLogs = () => {
    setLogs([]);
    addLog("Logs cleared", "info");
  };

  async function startLigoloAgent(WEBSOCKET_URL: string, agentId: string) {
    setIsConnecting(true);
    addLog(`Connecting to WebSocket : ${WEBSOCKET_URL}`, "info");

    try {
      const webSocketStream = connect(WEBSOCKET_URL);

      await webSocketStream.connected();

      addLog("WebSocket connection success.", "success");

      const muxer = yamux({
        maxInboundStreams: 10000000,
        maxOutboundStreams: 10000000,
        onIncomingStream: async (stream: YamuxStream) => {
          const decoder = new LigoloDecoder(stream.source);

          await decoder.decode();
          console.log("Decode successful! Payload:", decoder);

          const encoder = new LigoloEncoder(stream);

          switch (decoder.payloadType) {
            case MESSAGE_TYPES.MessageInfoRequest:
              setIsConnected(true);
              setIsConnecting(false);
              addLog("Information Request packet received", "info");
              const netIfs = new NetInterface(
                0,
                1500,
                "Chrome IWA",
                "123456",
                0,
                [],
              );
              const infoPacket = new InfoReplyPacket(
                "Ligolo-ng/JS",
                [netIfs],
                agentId,
              );

              await encoder.encode(infoPacket);
              break;
            case MESSAGE_TYPES.MessageConnectRequest:
              const connectInfo = decoder.payload as ConnectRequestPacket;
              let connection = null;

              if (connectInfo.Transport == 0) {
                connection = await createTcpPipe(
                  connectInfo.Address,
                  connectInfo.Port,
                  2000,
                );
              } else if (connectInfo.Transport == 1) {
                connection = await createUdpPipe(
                  connectInfo.Address,
                  connectInfo.Port,
                  2000,
                );
              }

              const connResult = new ConnectResponsePacket(true, false);
              const shake = await encoder.encode(connResult);

              setStats((prevState) => ({
                ...prevState,
                totalConnections: prevState.totalConnections + 1,
                activeConnections: prevState.activeConnections + 1,
              }));
              if (connectInfo.Transport == 0) {
                tcpBridge(shake, connection);
                await pipe(toIterable.source(connection), shake.stream);
              } else if (connectInfo.Transport == 1) {
                udpBridge(shake, connection);
                await pipe(async function* () {
                  // A generator is async iterable
                  const reader = connection?.readable.getReader();

                  try {
                    while (true) {
                      const { done, value } = await reader.read();

                      if (done) {
                        return;
                      }
                      yield value["data"];
                    }
                  } finally {
                    reader.releaseLock();
                  }
                }, shake.stream);
              }
              connection?.close();
              stream.close();
              setStats((prevState) => ({
                ...prevState,
                activeConnections: prevState.activeConnections - 1,
              }));
              break;
          }
        },
      })(component);

      const streamMuxer = muxer.createStreamMuxer();

      await pipe(
        webSocketStream,
        function transform(source) {
          return (async function* () {
            for await (const chunk of source) {
              setStats((prevState) => ({
                ...prevState,
                bytesIn: prevState.bytesIn + chunk.byteLength,
              }));
              yield chunk.subarray();
            }
          })();
        },
        streamMuxer,
        function transform(source) {
          return (async function* () {
            for await (const chunk of source) {
              setStats((prevState) => ({
                ...prevState,
                bytesOut: prevState.bytesOut + chunk.byteLength,
              }));
              yield chunk.subarray();
            }
          })();
        },
        webSocketStream,
      );
    } catch (error) {
      setIsConnected(false);
      setIsConnecting(false);
      addLog(`Error: ${error}`, "error");
    }
  }

  React.useEffect(() => {
    // Initial log
    addLog("Ligolo-ng agent initialized", "info");
    addLog("Ready to connect to Ligolo-ng Server", "info");
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col">
      <header className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Icon className="text-primary text-2xl" icon="lucide:link" />
            <h1 className="text-2xl font-semibold text-foreground">
              Ligolo-ng Agent Connection
            </h1>
          </div>
          <ThemeSwitcher />
        </div>
        <p className="text-foreground-500">
          Connect to and manage your Ligolo-ng JavaScript agent
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card className="h-auto overflow-visible">
            <CardHeader className="flex flex-col gap-1">
              <h2 className="text-lg font-medium">Connection Settings</h2>
              <p className="text-small text-foreground-500">
                Configure your agent connection
              </p>
            </CardHeader>
            <Divider />
            <CardBody>
              <ConnectionForm
                connectionDetails={connectionDetails}
                isConnected={isConnected}
                isConnecting={isConnecting}
                setConnectionDetails={setConnectionDetails}
              />
            </CardBody>
            <Divider />
            <CardFooter className="flex justify-between items-center">
              <ConnectionStatus isConnected={isConnected} />
              <div className="flex gap-2">
                <Button
                  color={isConnected ? "danger" : "primary"}
                  isDisabled={isConnecting}
                  startContent={isConnecting ? <Spinner size="sm" /> : null}
                  onPress={handleConnect}
                >
                  {isConnecting
                    ? isConnected
                      ? "Disconnecting..."
                      : "Connecting..."
                    : isConnected
                      ? "Disconnect"
                      : "Connect"}
                </Button>
              </div>
            </CardFooter>
          </Card>

          <ConnectionStatistics isConnected={isConnected} stats={stats} />
        </div>

        <div className="lg:col-span-2">
          <LogDisplay clearLogs={clearLogs} logs={logs} />
        </div>
      </div>
    </div>
  );
}
