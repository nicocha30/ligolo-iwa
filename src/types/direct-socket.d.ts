/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* https://wicg.github.io/direct-sockets/#dom-tcpsocketoptions */
interface TCPSocketOptions {
  sendBufferSize?: number;
  receiveBufferSize?: number;

  noDelay?: boolean;
  keepAliveDelay?: number;
}

/* https://wicg.github.io/direct-sockets/#dom-tcpsocketopeninfo */
interface TCPSocketOpenInfo {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;

  remoteAddress: string;
  remotePort: number;

  localAddress: string;
  localPort: number;
}

/**
 * https://wicg.github.io/direct-sockets/#dom-tcpsocket
 */
declare class TCPSocket {
  constructor(
    remoteAddress: string,
    remotePort: number,
    options?: TCPSocketOptions,
  );

  opened: Promise<TCPSocketOpenInfo>;
  closed: Promise<void>;

  close(): Promise<void>;
}

/* https://wicg.github.io/direct-sockets/#dom-tcpserversocketoptions */
interface TCPServerSocketOptions {
  localPort?: number;
  backlog?: number;

  ipv6Only?: boolean;
}

/* https://wicg.github.io/direct-sockets/#dom-tcpserversocketopeninfo */
interface TCPServerSocketOpenInfo {
  readable: ReadableStream<TCPSocket>;

  localAddress: string;
  localPort: number;
}

/**
 * https://wicg.github.io/direct-sockets/#dom-tcpserversocket
 */
declare class TCPServerSocket {
  constructor(localAddress: string, options?: TCPServerSocketOptions);

  opened: Promise<TCPServerSocketOpenInfo>;
  closed: Promise<void>;

  close(): Promise<void>;
}

/**
 * @see https://wicg.github.io/direct-sockets/
 */

interface UDPSocketOptions {
  /**
   * L'adresse IP distante à laquelle se connecter. Si elle est spécifiée, `remotePort` doit également l'être.
   */
  remoteAddress?: string;
  /**
   * Le port distant auquel se connecter.
   */
  remotePort?: number;
  /**
   * L'adresse IP locale à laquelle se lier.
   */
  localAddress?: string;
  /**
   * Le port local auquel se lier.
   */
  localPort?: number;
  /**
   * La taille du tampon de réception en octets.
   */
  receiveBufferSize?: number;
  /**
   * La taille du tampon d'envoi en octets.
   */
  sendBufferSize?: number;
}

interface UDPMessage {
  /**
   * Les données reçues.
   */
  data: ArrayBuffer;
  /**
   * L'adresse IP de l'expéditeur.
   */
  remoteAddress: string;
  /**
   * Le port de l'expéditeur.
   */
  remotePort: number;
}

declare class UDPSocket {
  /**
   * Crée une nouvelle instance de UDPSocket.
   * @param options Les options pour configurer le socket.
   */
  constructor(options?: UDPSocketOptions);

  /**
   * Une promesse qui se résout lorsque le socket est ouvert et prêt à être utilisé.
   */
  readonly opened: Promise<UDPSocketOpenInfo>;

  /**
   * Une promesse qui se résout lorsque le socket est fermé.
   */
  readonly closed: Promise<void>;

  /**
   * Un `ReadableStream` pour lire les paquets UDP entrants.
   * Chaque morceau du flux est un objet `UDPMessage`.
   */
  readonly readable: ReadableStream<UDPMessage>;

  /**
   * Un `WritableStream` pour écrire des données dans le socket.
   * Les données peuvent être un `ArrayBuffer`, une `TypedArray`, ou une `DataView`.
   * Si le socket est connecté, les données sont envoyées à l'adresse distante configurée.
   * Sinon, chaque écriture doit être un objet avec des propriétés `data`, `remoteAddress`, et `remotePort`.
   */
  readonly writable: WritableStream<
    | ArrayBuffer
    | ArrayBufferView
    | {
        data: ArrayBuffer | ArrayBufferView;
        remoteAddress: string;
        remotePort: number;
      }
  >;

  /**
   * L'adresse locale à laquelle le socket est lié.
   */
  readonly localAddress?: string;

  /**
   * Le port local auquel le socket est lié.
   */
  readonly localPort?: number;

  /**
   * L'adresse distante par défaut pour le socket.
   */
  readonly remoteAddress?: string;

  /**
   * Le port distant par défaut pour le socket.
   */
  readonly remotePort?: number;

  /**
   * Ferme le socket UDP.
   * @param reason La raison de la fermeture.
   */
  close(reason?: any): Promise<void>;
}

interface UDPSocketOpenInfo {
  readable: ReadableStream;
  writable: WritableStream;

  remoteAddress: string;
  remotePort: number;

  localAddress: string;
  localPort: number;
}
