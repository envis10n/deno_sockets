import { v4 } from "https://deno.land/std@0.65.0/uuid/mod.ts";
import { EventEmitter } from "https://deno.land/x/deno_events@0.1.1/mod.ts";

/**
 * Events for the Server class.
 */
interface IServerEvents {
  /**
   * Emitted when a new client has connected.
   * @param {Client} socket The Client object.
   * @returns A boolean indicating whether or not to accept, or undefined.
   */
  connection(socket: Client): boolean | undefined;
  /**
   * Emitted when a client has disconnected.
   * @param {Client} socket The Client object.
   */
  disconnect(socket: Client): void;
  /**
   * Emitted when an error has occurred.
   * @param {Error} e The Error object.
   */
  error(e: Error): void;
  /**
   * Emitted when the server has completely closed.
   */
  close(): void;
}

/**
 * Events for the Client class.
 */
interface IClientEvents {
  /**
   * Emitted when data has been received.
   * @param {Uint8Array} chunk The byte array received.
   */
  data(chunk: Uint8Array): void;
  /**
   * Emitted when an error has occurred.
   * @param {Error} e The Error object.
   */
  error(e: Error): void;
  /**
   * Emitted when the socket has closed.
   */
  close(): void;
}

export class Server extends EventEmitter<IServerEvents> {
  private _server: Deno.Listener;
  public readonly clients: Map<string, Client> = new Map();
  constructor(options: Deno.ListenOptions) {
    super();
    this._server = Deno.listen(options);
    this.listen()
      .catch((e) => {
        this.emit("error", e);
      })
      .finally(() => {
        this.emit("close");
      });
  }
  private async listen(): Promise<void> {
    for await (const conn of this._server) {
      let client: Client | null = null;
      client = new Client(conn);
      this.clients.set(client.uuid, client);
      client.on("close", () => {
        if (client == null) return;
        this.emit("disconnect", client);
        this.clients.delete(client.uuid);
        client = null;
      });
      const accept = this.emit("connection", client);
      if (typeof (accept) == "boolean" && accept == false) conn.close();
    }
  }
}

export class Client extends EventEmitter<IClientEvents> {
  static async connect(options: Deno.ConnectOptions): Promise<Client> {
    return new Client(await Deno.connect(options));
  }
  public readonly uuid: string = v4.generate();
  private _socket: Deno.Conn;
  constructor(socket: Deno.Conn) {
    super();
    this._socket = socket;
    this.read()
      .catch((e) => {
        this.emit("error", e);
      })
      .finally(() => {
        this.emit("close");
      });
  }
  private async read(): Promise<void> {
    for await (const buffer of Deno.iter(this._socket)) {
      this.emit("data", buffer);
    }
  }
  async send(data: string): Promise<number> {
    return await this.write(new TextEncoder().encode(data));
  }
  async write(buffer: Uint8Array): Promise<number> {
    return await this._socket.write(buffer);
  }
  close(): void {
    this._socket.close();
  }
}
