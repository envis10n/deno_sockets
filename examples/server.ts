/*
  This demonstrates a simple echo server using the library.

  A client connects, and when data is received, it is echoed back.
*/

import { Server } from "../mod.ts";

const server = new Server({ port: 3000, hostname: "localhost" });

server.on("connection", (socket) => {
  console.log("Client", socket.uuid, "connected.");
  socket.on("error", (e) => {
    console.error(e);
  });
  socket.on("close", () => {
    console.log("Client", socket.uuid, "disconnected.");
  });
  socket.on("data", (chunk) => {
    console.log(socket.uuid, ":", new TextDecoder().decode(chunk));
    socket.write(chunk);
  });
});

console.log("Listening on localhost:3000...");
