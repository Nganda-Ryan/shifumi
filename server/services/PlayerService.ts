import { v4 as uuidv4 } from "uuid";
import { Player, PlayerStatus } from "../types/game.types";

class PlayerService {
  private players: Map<string, Player> = new Map();

  registerPlayer(sessionId: string, username?: string, socketId?: string): Player {
    const playerId = uuidv4();
    const player: Player = {
      id: playerId,
      username,
      sessionId,
      status: "available",
      socketId,
    };
    this.players.set(playerId, player);
    return player;
  }

  getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  getPlayerBySessionId(sessionId: string): Player | undefined {
    for (const player of this.players.values()) {
      if (player.sessionId === sessionId) {
        return player;
      }
    }
    return undefined;
  }

  getAvailablePlayers(excludeId?: string): Player[] {
    return Array.from(this.players.values()).filter(
      (player) => player.status === "available" && player.id !== excludeId
    );
  }

  updatePlayerStatus(playerId: string, status: PlayerStatus): boolean {
    const player = this.players.get(playerId);
    if (player) {
      player.status = status;
      return true;
    }
    return false;
  }

  updatePlayerSocketId(playerId: string, socketId: string): boolean {
    const player = this.players.get(playerId);
    if (player) {
      player.socketId = socketId;
      return true;
    }
    return false;
  }

  updatePlayerUsername(playerId: string, username: string): boolean {
    const player = this.players.get(playerId);
    if (player) {
      player.username = username;
      return true;
    }
    return false;
  }

  removePlayer(playerId: string): boolean {
    return this.players.delete(playerId);
  }

  getAllPlayers(): Player[] {
    return Array.from(this.players.values());
  }
}

export default new PlayerService();

