import { TClient, TClientHandler, connect } from "../mod.ts";

const EchoClient: TClientHandler = {
  onData(buffer) {
    console.log(new TextDecoder().decode(buffer));
    this.socket.close();
  },
};

const client: TClient = await connect({ port: 3000 }, EchoClient);
console.log("Connected.");
client.send("Hello, Deno!");
