import Sockets from "../mod.ts";

const EchoServer: Sockets.Server.IServerHandler = {
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

const server: Sockets.Server = Sockets.Server.listen(
  { port: 3000 },
  EchoServer,
);
console.log("Listening on localhost:3000");
