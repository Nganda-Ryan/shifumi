/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { handleConnection, registerSocket, unregisterSocket } from "./handlers/socketHandlers";

const PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Créer un serveur HTTP pour le health check et les WebSockets
const server = createServer((req, res) => {
  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "shi-fu-mi-websocket" }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocketServer({ server });

server.listen(PORT, () => {
  console.log(`WebSocket server started on port ${PORT}`);
});

wss.on("connection", (ws: WebSocket) => {
  const socketWithPlayer = ws as any;
  registerSocket(socketWithPlayer);
  handleConnection(socketWithPlayer);

  ws.on("close", () => {
    unregisterSocket(socketWithPlayer);
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, closing server");
  wss.close(() => {
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, closing server");
  wss.close(() => {
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });
});

