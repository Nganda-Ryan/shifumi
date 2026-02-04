import { v4 as uuidv4 } from "uuid";
import { Game, Player, Move } from "../types/game.types";
import { Result } from "../types/game.types";
import PlayerService from "./PlayerService";

// Phase du round pour la synchronisation
type RoundPhase = "idle" | "pre-countdown" | "shi-fu-mi" | "result";

// Move par défaut si le joueur ne sélectionne rien
const DEFAULT_MOVE: Move = "stone";

class GameService {
  private games: Map<string, Game> = new Map();
  // Stocker la phase et le timestamp pour chaque jeu
  private roundPhases: Map<string, RoundPhase> = new Map();
  private roundTimestamps: Map<string, number> = new Map();

  createGame(player1: Player, player2: Player): Game {
    const gameId = uuidv4();
    const game: Game = {
      id: gameId,
      player1,
      player2,
      scores: {
        player1: 0,
        player2: 0,
      },
      currentRound: 0,
      moves: {},
      roundStarted: false,
    };
    this.games.set(gameId, game);
    this.roundPhases.set(gameId, "idle");

    // Update player statuses
    PlayerService.updatePlayerStatus(player1.id, "in-game");
    PlayerService.updatePlayerStatus(player2.id, "in-game");

    return game;
  }

  getRoundPhase(gameId: string): RoundPhase {
    return this.roundPhases.get(gameId) || "idle";
  }

  setRoundPhase(gameId: string, phase: RoundPhase): void {
    this.roundPhases.set(gameId, phase);
    if (phase === "pre-countdown") {
      this.roundTimestamps.set(gameId, Date.now());
    }
  }

  getRoundStartTimestamp(gameId: string): number {
    return this.roundTimestamps.get(gameId) || Date.now();
  }

  // Appliquer le move par défaut pour les joueurs qui n'ont pas joué
  applyDefaultMoves(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    if (!game.moves.player1) {
      game.moves.player1 = DEFAULT_MOVE;
    }
    if (!game.moves.player2) {
      game.moves.player2 = DEFAULT_MOVE;
    }
  }

  // Vérifier si les deux joueurs ont joué
  bothPlayersHaveMoved(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;
    return !!game.moves.player1 && !!game.moves.player2;
  }

  getGame(gameId: string): Game | undefined {
    return this.games.get(gameId);
  }

  recordMove(gameId: string, playerId: string, move: Move): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;

    // Determine which player made the move
    const isPlayer1 = game.player1.id === playerId;
    const isPlayer2 = game.player2.id === playerId;

    if (!isPlayer1 && !isPlayer2) return false;

    // Record the move
    if (isPlayer1) {
      game.moves.player1 = move;
    } else {
      game.moves.player2 = move;
    }

    return true;
  }

  // Calculer le résultat sans modifier les scores (pour éviter les appels multiples)
  private getWinner(gameId: string): "player1" | "player2" | "draw" | null {
    const game = this.games.get(gameId);
    if (!game || !game.moves.player1 || !game.moves.player2) {
      return null;
    }

    const player1Move = game.moves.player1;
    const player2Move = game.moves.player2;

    if (player1Move === player2Move) {
      return "draw";
    } else if (
      (player1Move === "stone" && player2Move === "scissors") ||
      (player1Move === "paper" && player2Move === "stone") ||
      (player1Move === "scissors" && player2Move === "paper")
    ) {
      return "player1";
    } else {
      return "player2";
    }
  }

  // Calculer le résultat ET mettre à jour les scores (appeler une seule fois par round)
  calculateRoundResult(gameId: string): Result | null {
    const winner = this.getWinner(gameId);
    if (winner === null) return null;

    const game = this.games.get(gameId);
    if (!game) return null;

    // Incrémenter le score du gagnant (une seule fois)
    if (winner === "player1") {
      game.scores.player1 += 1;
      return "Win";
    } else if (winner === "player2") {
      game.scores.player2 += 1;
      return "Loose";
    }
    return "Draw";
  }

  // Obtenir le résultat pour un joueur spécifique (sans modifier les scores)
  getRoundResultForPlayer(gameId: string, playerId: string): Result | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    const winner = this.getWinner(gameId);
    if (winner === null) return null;

    const isPlayer1 = game.player1.id === playerId;

    if (winner === "draw") return "Draw";
    if (winner === "player1") {
      return isPlayer1 ? "Win" : "Loose";
    }
    if (winner === "player2") {
      return isPlayer1 ? "Loose" : "Win";
    }

    return null;
  }

  startNewRound(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;

    game.currentRound += 1;
    game.moves = {};
    game.roundStarted = true;
    return true;
  }

  endGame(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;

    // Update player statuses back to available
    PlayerService.updatePlayerStatus(game.player1.id, "available");
    PlayerService.updatePlayerStatus(game.player2.id, "available");

    // Nettoyer les données de synchronisation
    this.games.delete(gameId);
    this.roundPhases.delete(gameId);
    this.roundTimestamps.delete(gameId);
    return true;
  }

  getGameByPlayerId(playerId: string): Game | undefined {
    for (const game of this.games.values()) {
      if (game.player1.id === playerId || game.player2.id === playerId) {
        return game;
      }
    }
    return undefined;
  }

  getOpponent(gameId: string, playerId: string): Player | undefined {
    const game = this.games.get(gameId);
    if (!game) return undefined;

    if (game.player1.id === playerId) {
      return game.player2;
    } else if (game.player2.id === playerId) {
      return game.player1;
    }
    return undefined;
  }
}

export default new GameService();

