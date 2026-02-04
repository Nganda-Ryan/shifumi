"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
const http_1 = require("http");
const ws_1 = require("ws");
const socketHandlers_1 = require("./handlers/socketHandlers");
const PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : process.env.PORT ? parseInt(process.env.PORT) : 3001;
// Créer un serveur HTTP pour le health check et les WebSockets
const server = (0, http_1.createServer)((req, res) => {
    if (req.url === "/" || req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", service: "shi-fu-mi-websocket" }));
    }
    else {
        res.writeHead(404);
        res.end();
    }
});
const wss = new ws_1.WebSocketServer({ server });
server.listen(PORT, () => {
    console.log(`WebSocket server started on port ${PORT}`);
});
wss.on("connection", (ws) => {
    const socketWithPlayer = ws;
    (0, socketHandlers_1.registerSocket)(socketWithPlayer);
    (0, socketHandlers_1.handleConnection)(socketWithPlayer);
    ws.on("close", () => {
        (0, socketHandlers_1.unregisterSocket)(socketWithPlayer);
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
//# sourceMappingURL=index.js.map