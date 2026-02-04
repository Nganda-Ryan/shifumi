import { Player, PlayerStatus } from "../types/game.types";
declare class PlayerService {
    private players;
    registerPlayer(sessionId: string, username?: string, socketId?: string): Player;
    getPlayer(playerId: string): Player | undefined;
    getPlayerBySessionId(sessionId: string): Player | undefined;
    getAvailablePlayers(excludeId?: string): Player[];
    updatePlayerStatus(playerId: string, status: PlayerStatus): boolean;
    updatePlayerSocketId(playerId: string, socketId: string): boolean;
    updatePlayerUsername(playerId: string, username: string): boolean;
    removePlayer(playerId: string): boolean;
    getAllPlayers(): Player[];
}
declare const _default: PlayerService;
export default _default;
