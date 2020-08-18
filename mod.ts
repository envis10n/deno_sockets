import { v4 } from "https://deno.land/std@0.65.0/uuid/mod.ts";

namespace Sockets {
  /*
    Client
  */
  function buildClient(
    conn: Deno.Conn,
    handlers?: Client.IClientHandler,
  ): Client {
    const client: Client = {
      uuid: v4.generate(),
      handlers,
      async send(data: string) {
        return await conn.write(new TextEncoder().encode(data));
      },
      async write(buffer: Uint8Array) {
        return await conn.write(buffer);
      },
      socket: conn,
    };
    if (handlers == undefined) return client;
    new Promise(async (resolve, reject) => {
      try {
        for await (const b of Deno.iter(conn)) {
          client.handlers?.onData?.call(client, b);
        }
        resolve();
      } catch (e) {
        reject(e);
      }
    })
      .catch((e) => {
        client.handlers?.onError?.call(client, e);
      });
    return client;
  }
  export namespace Client {
    export interface IClientHandler {
      onData?(this: Client, buffer: Uint8Array): void;
      onError?(this: Client, e: Error): void;
    }
    export async function connect(
      options: Deno.ConnectOptions,
      handlers?: Client.IClientHandler,
    ): Promise<Client> {
      return buildClient(await Deno.connect(options), handlers);
    }
    export async function connectTls(
      options: Deno.ConnectTlsOptions,
      handlers?: Client.IClientHandler,
    ): Promise<Client> {
      return buildClient(await Deno.connectTls(options), handlers);
    }
  }
  export interface Client {
    readonly uuid: string;
    readonly handlers?: Client.IClientHandler;
    send(data: string): Promise<number>;
    write(buffer: Uint8Array): Promise<number>;
    readonly socket: Deno.Conn;
  }
  /*
    Server
  */
  export namespace Server {
    export interface IServerHandler {
      onData?(this: Server, client: Client, buffer: Uint8Array): void;
      onConnection?(this: Server, client: Client): void;
      onDisconnect?(this: Server, uuid: string, hadError: boolean): void;
      onClientError?(this: Server, client: Client, e: Error): void;
      onServerError?(this: Server, e: Error): void;
      onClose?(this: Server, hadError: boolean): void;
    }
  }
  export class Server {
    private readonly _clients: Map<string, Client> = new Map();
    private readonly _listener: Deno.Listener;
    private _hadError: boolean = false;
    private _handlers: Server.IServerHandler;
    static listen(
      options: Deno.ListenOptions,
      handlers: Server.IServerHandler,
    ): Server {
      return new Server(Deno.listen(options), handlers);
    }
    static listenTls(
      options: Deno.ListenTlsOptions,
      handlers: Server.IServerHandler,
    ): Server {
      return new Server(Deno.listenTls(options), handlers);
    }
    constructor(
      listener: Deno.Listener,
      handlers: Server.IServerHandler,
    ) {
      this._handlers = handlers;
      this._listener = listener;
      this.loop()
        .catch((e) => {
          this._handlers.onServerError?.call(this, e);
          this._hadError = true;
        })
        .finally(() => {
          this._handlers.onClose?.call(this, this._hadError);
          // Internal cleanup
          this._clients.clear();
        });
    }
    async loop(): Promise<void> {
      for await (const conn of this._listener) {
        let container: Client = buildClient(conn);
        const cuuid: string = container.uuid;
        let bHadError: boolean = false;
        this._clients.set(cuuid, container);
        new Promise(async (resolve, reject) => {
          try {
            for await (const b of Deno.iter(conn)) {
              this._handlers.onData?.call(this, container, b);
            }
            resolve();
          } catch (e) {
            reject(e);
          }
        })
          .catch((e) => {
            this._handlers.onClientError?.call(this, container, e);
            bHadError = true;
          })
          .finally(() => {
            // cleanup
            this._clients.delete(cuuid);
            this._handlers.onDisconnect?.call(this, cuuid, bHadError);
          });
        this._handlers.onConnection?.call(this, container);
      }
    }
  }
}

export default Sockets;
