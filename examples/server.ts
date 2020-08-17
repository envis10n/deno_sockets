import { TServer, TServerHandler } from "../mod.ts";

const EchoServer: TServerHandler = {
  onConnection(client) {
    console.log(client.uuid, "connected.");
  },
  onData(client, buffer) {
    console.log(client.uuid, ":", new TextDecoder().decode(buffer));
    client.write(buffer);
  },
  onDisconnect(uuid: string) {
    console.log(uuid, "disconnected.");
  },
};

const server: TServer = TServer.listen({ port: 3000 }, EchoServer);
console.log("Listening on localhost:3000");
