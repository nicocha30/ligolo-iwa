export interface TcpSocketConnection {
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
}

export interface UdpSocketConnection {
  close(): Promise<void>;
  readable: ReadableStream<UDPMessage>;
  writable: UDPSocket["writable"];
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(message));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId != null) {
      clearTimeout(timeoutId);
    }
  }
}

export async function createTcpPipe(
  ip: string,
  port: number,
  timeoutMs: number,
): Promise<TcpSocketConnection> {
  try {
    const socket = new TCPSocket(ip, port, {});
    const { readable, writable } = await withTimeout(
      socket.opened,
      timeoutMs,
      `TCP connection timed out after ${timeoutMs} ms`,
    );

    return {
      readable,
      writable,
      close: () => socket.close(),
    };
  } catch (error) {
    throw new Error(
      `Unable to connect to ${ip}:${port} over TCP: ${formatError(error)}`,
    );
  }
}

export async function createUdpPipe(
  ip: string,
  port: number,
  timeoutMs: number,
): Promise<UdpSocketConnection> {
  try {
    const socket = new UDPSocket({ remoteAddress: ip, remotePort: port });
    const { readable, writable } = await withTimeout(
      socket.opened,
      timeoutMs,
      `UDP connection timed out after ${timeoutMs} ms`,
    );

    return {
      readable,
      writable,
      close: () => socket.close(),
    };
  } catch (error) {
    throw new Error(
      `Unable to connect to ${ip}:${port} over UDP: ${formatError(error)}`,
    );
  }
}
