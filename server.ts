import { TClient, buildClient } from "./client.ts";

export interface TServerHandler {
  onData?(this: TServer, client: TClient, buffer: Uint8Array): void;
  onConnection?(this: TServer, client: TClient): void;
  onDisconnect?(this: TServer, uuid: string, hadError: boolean): void;
  onClientError?(this: TServer, client: TClient, e: Error): void;
  onServerError?(this: TServer, e: Error): void;
  onClose?(this: TServer, hadError: boolean): void;
}

export class TServer {
  private readonly _clients: Map<string, TClient> = new Map();
  private readonly _listener: Deno.Listener;
  private _hadError: boolean = false;
  private _handlers: TServerHandler;
  static listen(
    options: Deno.ListenOptions,
    handlers: TServerHandler,
  ): TServer {
    return new TServer(Deno.listen(options), handlers);
  }
  static listenTls(
    options: Deno.ListenTlsOptions,
    handlers: TServerHandler,
  ): TServer {
    return new TServer(Deno.listenTls(options), handlers);
  }
  constructor(
    listener: Deno.Listener,
    handlers: TServerHandler,
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
      let container: TClient = buildClient(conn);
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
