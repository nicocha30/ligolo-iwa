export async function createTcpPipe(ip: string, port: number, timeoutMs: number) {
  try {
    const socket = new TCPSocket(ip, port, {});

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout de connexion dépassé (${timeoutMs} ms)`));
      }, timeoutMs);
    });

    const { readable, writable } = await Promise.race([
      socket.opened,
      timeoutPromise
    ]);

    console.log(`TCP Connection established ${ip}:${port}`);

    return {
      readable,
      writable,
      getReader: () => readable.getReader(),
      close: () => socket.close(),
      once: (_ : string) => {},
      destroy: () => {console.log("close")},
      removeListener: () => {}
    };
  } catch (error) {
    console.error(`Unable to connect to ${ip}:${port} (TCP)`, error);
    throw error;
  }
}

export async function createUdpPipe(ip: string, port: number, timeoutMs: number) {
  try {
    const socket = new UDPSocket({remoteAddress: ip, remotePort: port});

    const { readable, writable } = await socket.opened;

    console.log(`UDP Connection established ${ip}:${port}`);

    return {
      readable,
      writable,
      getReader: () => readable.getReader(),
      close: () => socket.close(),
      once: (_ : string) => {},
      destroy: () => {console.log("close")},
      removeListener: () => {}
    };
  } catch (error) {
    console.error(`Unable to connect to ${ip}:${port} (UDP)`, error);
    throw error;
  }
}