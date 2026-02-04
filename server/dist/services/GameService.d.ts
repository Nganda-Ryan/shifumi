import { Game, Player, Move } from "../types/game.types";
import { Result } from "../types/game.types";
type RoundPhase = "idle" | "pre-countdown" | "shi-fu-mi" | "result";
declare class GameService {
    private games;
    private roundPhases;
    private roundTimestamps;
    createGame(player1: Player, player2: Player): Game;
    getRoundPhase(gameId: string): RoundPhase;
    setRoundPhase(gameId: string, phase: RoundPhase): void;
    getRoundStartTimestamp(gameId: string): number;
    applyDefaultMoves(gameId: string): void;
    bothPlayersHaveMoved(gameId: string): boolean;
    getGame(gameId: string): Game | undefined;
    recordMove(gameId: string, playerId: string, move: Move): boolean;
    private getWinner;
    calculateRoundResult(gameId: string): Result | null;
    getRoundResultForPlayer(gameId: string, playerId: string): Result | null;
    startNewRound(gameId: string): boolean;
    endGame(gameId: string): boolean;
    getGameByPlayerId(playerId: string): Game | undefined;
    getOpponent(gameId: string, playerId: string): Player | undefined;
}
declare const _default: GameService;
export default _default;
