"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
class PlayerService {
    constructor() {
        this.players = new Map();
    }
    registerPlayer(sessionId, username, socketId) {
        const playerId = (0, uuid_1.v4)();
        const player = {
            id: playerId,
            username,
            sessionId,
            status: "available",
            socketId,
        };
        this.players.set(playerId, player);
        return player;
    }
    getPlayer(playerId) {
        return this.players.get(playerId);
    }
    getPlayerBySessionId(sessionId) {
        for (const player of this.players.values()) {
            if (player.sessionId === sessionId) {
                return player;
            }
        }
        return undefined;
    }
    getAvailablePlayers(excludeId) {
        return Array.from(this.players.values()).filter((player) => player.status === "available" && player.id !== excludeId);
    }
    updatePlayerStatus(playerId, status) {
        const player = this.players.get(playerId);
        if (player) {
            player.status = status;
            return true;
        }
        return false;
    }
    updatePlayerSocketId(playerId, socketId) {
        const player = this.players.get(playerId);
        if (player) {
            player.socketId = socketId;
            return true;
        }
        return false;
    }
    updatePlayerUsername(playerId, username) {
        const player = this.players.get(playerId);
        if (player) {
            player.username = username;
            return true;
        }
        return false;
    }
    removePlayer(playerId) {
        return this.players.delete(playerId);
    }
    getAllPlayers() {
        return Array.from(this.players.values());
    }
}
exports.default = new PlayerService();
//# sourceMappingURL=PlayerService.js.map