/*
  This example demonstrates creating a client connection.
  
  It connects on the host and port of the example server,
  sends some data, and then closes when it receives the 
  echo.
*/

import { Client } from "../mod.ts";

let socket: Client | null = null;
socket = await Client.connect(
  { port: 3000, hostname: "localhost" },
);

socket.on("data", (chunk) => {
  if (socket == null) return;
  console.log(new TextDecoder().decode(chunk));
  socket.close();
});

socket.on("error", (e) => {
  // I'm not sure how to handle BadResource in this case. More research needed.
  if (e.name !== "BadResource") {
    console.error(e);
  }
});

socket.on("close", () => {
  console.log("Disconnected.");
  socket = null;
});

await socket.send("Hello, Deno!");
