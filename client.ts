import { v4 } from "https://deno.land/std@0.65.0/uuid/mod.ts";

export interface TClientHandler {
  onData?(this: TClient, buffer: Uint8Array): void;
  onError?(this: TClient, e: Error): void;
}

export interface TClient {
  readonly uuid: string;
  readonly handlers?: TClientHandler;
  send(data: string): Promise<number>;
  write(buffer: Uint8Array): Promise<number>;
  readonly socket: Deno.Conn;
}

export function buildClient(
  conn: Deno.Conn,
  handlers?: TClientHandler,
): TClient {
  const client: TClient = {
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

export async function connect(
  options: Deno.ConnectOptions,
  handlers?: TClientHandler,
): Promise<TClient> {
  return buildClient(await Deno.connect(options), handlers);
}

export async function connectTls(
  options: Deno.ConnectTlsOptions,
  handlers?: TClientHandler,
): Promise<TClient> {
  return buildClient(await Deno.connectTls(options), handlers);
}
