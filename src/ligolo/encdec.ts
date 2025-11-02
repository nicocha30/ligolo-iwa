import { Packr, Unpackr } from "msgpackr";
import { YamuxStream } from "@chainsafe/libp2p-yamux/stream";
import { Uint8ArrayList } from "uint8arraylist";
import { Handshake, handshake } from "it-handshake";

export const MESSAGE_TYPES = {
  MessageInfoRequest: 0,
  MessageInfoReply: 1,
  MessageConnectRequest: 2,
  MessageConnectResponse: 3,
  MessageHostPingRequest: 4,
  MessageHostPingResponse: 5,
  MessageListenerRequest: 6,
  MessageListenerResponse: 7,
  MessageListenerBindRequest: 8,
  MessageListenerBindResponse: 9,
  MessageListenerSockRequest: 10,
  MessageListenerSockResponse: 11,
  MessageListenerCloseRequest: 12,
  MessageListenerCloseResponse: 13,
  MessageAgentKillRequest: 14,
  MessageListenerSocketConnectionReady: 15,
} as const;

export const TRANSPORT_TYPES = {
  TransportTCP: 0,
  TransportUDP: 1,
} as const;

export const NETWORK_TYPES = {
  Networkv4: 0,
  Networkv6: 1,
} as const;

export class NetInterface {
  public readonly Index: number;
  public readonly MTU: number;
  public readonly Name: string;
  public readonly HardwareAddr: string;
  public readonly Flags: number;
  public readonly Addresses: string[];

  constructor(
    index: number,
    mtu: number,
    name: string,
    hardwareAddr: string,
    flags: number,
    addresses: string[],
  ) {
    this.Index = index;
    this.MTU = mtu;
    this.Name = name;
    this.HardwareAddr = hardwareAddr;
    this.Flags = flags;
    this.Addresses = addresses;
  }
}

export class InfoRequestPacket {}

export class InfoReplyPacket {
  public readonly Name: string;
  public readonly Interfaces: NetInterface[];
  public readonly SessionID: string;

  constructor(name: string, interfaces: NetInterface[], sessionID: string) {
    this.Name = name;
    this.Interfaces = interfaces;
    this.SessionID = sessionID;
  }
}

export class ListenerSockRequestPacket {
  public readonly SockID: number;
  constructor(sockID: number) {
    this.SockID = sockID;
  }
}

export class ListenerSockResponsePacket {
  public readonly Err: boolean;
  public readonly ErrString: string;
  constructor(err: boolean, errString: string) {
    this.Err = err;
    this.ErrString = errString;
  }
}

export class ListenerSocketConnectionReady {
  public readonly Err: boolean;
  constructor(err: boolean) {
    this.Err = err;
  }
}

export class ListenerRequestPacket {
  public readonly Network: string;
  public readonly Address: string;
  constructor(network: string, address: string) {
    this.Network = network;
    this.Address = address;
  }
}

export class ListenerResponsePacket {
  public readonly ListenerID: number;
  public readonly Err: boolean;
  public readonly ErrString: string;
  constructor(listenerID: number, err: boolean, errString: string) {
    this.ListenerID = listenerID;
    this.Err = err;
    this.ErrString = errString;
  }
}

export class ListenerBindPacket {
  public readonly ListenerID: number;
  constructor(listenerID: number) {
    this.ListenerID = listenerID;
  }
}

export class ListenerBindReponse {
  public readonly SockID: number;
  public readonly Err: boolean;
  public readonly ErrString: string;
  constructor(sockID: number, err: boolean, errString: string) {
    this.SockID = sockID;
    this.Err = err;
    this.ErrString = errString;
  }
}

export class ListenerCloseRequestPacket {
  public readonly ListenerID: number;
  constructor(listenerID: number) {
    this.ListenerID = listenerID;
  }
}

export class ListenerCloseResponsePacket {
  public readonly Err: boolean;
  public readonly ErrString: string;
  constructor(err: boolean, errString: string) {
    this.Err = err;
    this.ErrString = errString;
  }
}

export class ConnectRequestPacket {
  public readonly Net: number;
  public readonly Transport: number;
  public readonly Address: string;
  public readonly Port: number;
  constructor(net: number, transport: number, address: string, port: number) {
    this.Net = net;
    this.Transport = transport;
    this.Address = address;
    this.Port = port;
  }
}

export class ConnectResponsePacket {
  public readonly Established: boolean;
  public readonly Reset: boolean;
  constructor(established: boolean, reset: boolean) {
    this.Established = established;
    this.Reset = reset;
  }
}

export class HostPingRequestPacket {
  public readonly Address: string;
  constructor(address: string) {
    this.Address = address;
  }
}

export class HostPingResponsePacket {
  public readonly Alive: boolean;
  constructor(alive: boolean) {
    this.Alive = alive;
  }
}

export class AgentKillRequestPacket {}

export type LigoloPacket =
  | InfoRequestPacket
  | InfoReplyPacket
  | ConnectRequestPacket
  | ConnectResponsePacket
  | HostPingRequestPacket
  | HostPingResponsePacket
  | ListenerRequestPacket
  | ListenerResponsePacket
  | ListenerBindPacket
  | ListenerBindReponse
  | ListenerSockRequestPacket
  | ListenerSockResponsePacket
  | ListenerCloseRequestPacket
  | ListenerCloseResponsePacket
  | AgentKillRequestPacket
  | ListenerSocketConnectionReady;

type MessageTypeValue = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];
type Constructor<T> = new (...args: any[]) => T;

const PAYLOAD_CLASS_MAP = new Map<Constructor<LigoloPacket>, MessageTypeValue>([
  [InfoRequestPacket, MESSAGE_TYPES.MessageInfoRequest],
  [InfoReplyPacket, MESSAGE_TYPES.MessageInfoReply],
  [ConnectRequestPacket, MESSAGE_TYPES.MessageConnectRequest],
  [ConnectResponsePacket, MESSAGE_TYPES.MessageConnectResponse],
  [HostPingRequestPacket, MESSAGE_TYPES.MessageHostPingRequest],
  [HostPingResponsePacket, MESSAGE_TYPES.MessageHostPingResponse],
  [ListenerRequestPacket, MESSAGE_TYPES.MessageListenerRequest],
  [ListenerResponsePacket, MESSAGE_TYPES.MessageListenerResponse],
  [ListenerBindPacket, MESSAGE_TYPES.MessageListenerBindRequest],
  [ListenerBindReponse, MESSAGE_TYPES.MessageListenerBindResponse],
  [ListenerSockRequestPacket, MESSAGE_TYPES.MessageListenerSockRequest],
  [ListenerSockResponsePacket, MESSAGE_TYPES.MessageListenerSockResponse],
  [ListenerCloseRequestPacket, MESSAGE_TYPES.MessageListenerCloseRequest],
  [ListenerCloseResponsePacket, MESSAGE_TYPES.MessageListenerCloseResponse],
  [AgentKillRequestPacket, MESSAGE_TYPES.MessageAgentKillRequest],
  [
    ListenerSocketConnectionReady,
    MESSAGE_TYPES.MessageListenerSocketConnectionReady,
  ],
]);

const PAYLOAD_TYPE_NAMES = Object.fromEntries(
  Object.entries(MESSAGE_TYPES).map(([name, value]) => [value, name]),
);

const MESSAGE_TYPE_TO_CLASS_MAP = new Map<
  MessageTypeValue,
  Constructor<LigoloPacket>
>(
  Array.from(PAYLOAD_CLASS_MAP.entries()).map(([cls, typeId]) => [typeId, cls]),
);

/** Encodes Ligolo-ng protocol messages to a stream. */
export class LigoloEncoder {
  private readonly _stream: Handshake;
  // MODIFIED: Use a Packr instance for encoding.
  private readonly _packer = new Packr({
    mapsAsObjects: true,
    useRecords: false,
  });

  constructor(stream: YamuxStream) {
    this._stream = handshake(stream);
  }

  /** Encodes a payload object and writes it to the stream. */
  public async encode(payload: LigoloPacket) {
    let payloadType: MessageTypeValue | undefined;

    for (const [cls, typeId] of PAYLOAD_CLASS_MAP.entries()) {
      if (payload instanceof cls) {
        payloadType = typeId;
        break;
      }
    }

    if (payloadType === undefined) {
      const typeName = payload?.constructor?.name || typeof payload;

      throw new Error(`Encode called for unknown payload type: ${typeName}`);
    }

    const encodedType = this._packer.pack(payloadType);
    const encodedPayload = this._packer.pack(payload);

    this._stream.write(encodedType);
    this._stream.write(encodedPayload);
    this._stream.rest();

    return this._stream;
  }
}

/** Decodes Ligolo-ng protocol messages from a stream. */
export class LigoloDecoder {
  public payload: LigoloPacket | null = null;
  public messageType: string | null = null;
  public payloadType: number | null = null;

  private readonly _decodedStream: AsyncGenerator<any, void, unknown>;

  constructor(stream: AsyncGenerator<Uint8ArrayList, void, unknown>) {
    if (!stream || typeof stream[Symbol.asyncIterator] !== "function") {
      throw new Error("The provided reader must be an async iterable.");
    }
    this._decodedStream = this.createMsgpackrStream(stream);
  }

  /**
   * Creates an async generator that decodes a raw byte stream into
   * distinct MessagePack objects.
   * @param rawStream The source stream of Uint8ArrayList chunks.
   */
  private async *createMsgpackrStream(
    rawStream: AsyncGenerator<Uint8ArrayList, void, unknown>,
  ): AsyncGenerator<any, void, unknown> {
    const unpackr = new Unpackr({ mapsAsObjects: true });

    for await (const chunk of rawStream) {
      // unpackr.unpackMultiple returns an array of fully decoded objects from the chunk.
      // It handles messages that span across multiple chunks internally.
      // We use chunk.subarray() to get a Uint8Array, which unpackr expects.
      const messages = unpackr.unpackMultiple(chunk.subarray());

      for (const message of messages) {
        yield message;
      }
    }
  }

  /** Reads and decodes the next Ligolo-ng message from the stream. */
  public async decode(): Promise<void> {
    // 1. Decode the message type ID
    const typeResult = await this._decodedStream.next();

    if (typeResult.done) {
      throw new Error(
        "Stream ended unexpectedly before payload type could be read.",
      );
    }
    const payloadType = typeResult.value as MessageTypeValue;

    this.payloadType = payloadType;
    this.messageType = PAYLOAD_TYPE_NAMES[payloadType];

    // 2. Look up the corresponding class constructor
    const PacketClass = MESSAGE_TYPE_TO_CLASS_MAP.get(payloadType);

    if (!PacketClass) {
      throw new Error(`Decode called for unknown payload type: ${payloadType}`);
    }

    // Packets with no payload
    if (
      PacketClass === InfoRequestPacket ||
      PacketClass === AgentKillRequestPacket
    ) {
      this.payload = new PacketClass();

      return;
    }

    const payloadResult = await this._decodedStream.next();

    if (payloadResult.done) {
      throw new Error(
        "Stream ended unexpectedly before payload could be read.",
      );
    }
    const rawPayload = payloadResult.value;

    switch (PacketClass) {
      case InfoReplyPacket:
        const interfaces = rawPayload.Interfaces.map(
          (iface: any) =>
            new NetInterface(
              iface.Index,
              iface.MTU,
              iface.Name,
              iface.HardwareAddr,
              iface.Flags,
              iface.Addresses,
            ),
        );

        this.payload = new InfoReplyPacket(
          rawPayload.Name,
          interfaces,
          rawPayload.SessionID,
        );
        break;

      case ConnectRequestPacket:
        this.payload = new ConnectRequestPacket(
          rawPayload.Net,
          rawPayload.Transport,
          rawPayload.Address,
          rawPayload.Port,
        );
        break;

      case ConnectResponsePacket:
        this.payload = new ConnectResponsePacket(
          rawPayload.Established,
          rawPayload.Reset,
        );
        break;

      case ListenerRequestPacket:
        this.payload = new ListenerRequestPacket(
          rawPayload.Network,
          rawPayload.Address,
        );
        break;

      case ListenerResponsePacket:
        this.payload = new ListenerResponsePacket(
          rawPayload.ListenerID,
          rawPayload.Err,
          rawPayload.ErrString,
        );
        break;

      case HostPingRequestPacket:
        this.payload = new HostPingRequestPacket(rawPayload.Address);
        break;

      default:
        console.log(rawPayload);
        throw new Error(
          `No constructor logic found for packet type: ${this.messageType}`,
        );
    }
  }
}
