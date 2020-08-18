import Sockets from "../mod.ts";

const EchoClient: Sockets.Client.IClientHandler = {
  onData(buffer) {
    console.log(new TextDecoder().decode(buffer));
    this.socket.close();
  },
};

const client: Sockets.Client = await Sockets.Client.connect(
  { port: 3000 },
  EchoClient,
);
console.log("Connected.");
client.send("Hello, Deno!");
