"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const PlayerService_1 = __importDefault(require("./PlayerService"));
// Move par défaut si le joueur ne sélectionne rien
const DEFAULT_MOVE = "stone";
class GameService {
    constructor() {
        this.games = new Map();
        // Stocker la phase et le timestamp pour chaque jeu
        this.roundPhases = new Map();
        this.roundTimestamps = new Map();
    }
    createGame(player1, player2) {
        const gameId = (0, uuid_1.v4)();
        const game = {
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
        PlayerService_1.default.updatePlayerStatus(player1.id, "in-game");
        PlayerService_1.default.updatePlayerStatus(player2.id, "in-game");
        return game;
    }
    getRoundPhase(gameId) {
        return this.roundPhases.get(gameId) || "idle";
    }
    setRoundPhase(gameId, phase) {
        this.roundPhases.set(gameId, phase);
        if (phase === "pre-countdown") {
            this.roundTimestamps.set(gameId, Date.now());
        }
    }
    getRoundStartTimestamp(gameId) {
        return this.roundTimestamps.get(gameId) || Date.now();
    }
    // Appliquer le move par défaut pour les joueurs qui n'ont pas joué
    applyDefaultMoves(gameId) {
        const game = this.games.get(gameId);
        if (!game)
            return;
        if (!game.moves.player1) {
            game.moves.player1 = DEFAULT_MOVE;
        }
        if (!game.moves.player2) {
            game.moves.player2 = DEFAULT_MOVE;
        }
    }
    // Vérifier si les deux joueurs ont joué
    bothPlayersHaveMoved(gameId) {
        const game = this.games.get(gameId);
        if (!game)
            return false;
        return !!game.moves.player1 && !!game.moves.player2;
    }
    getGame(gameId) {
        return this.games.get(gameId);
    }
    recordMove(gameId, playerId, move) {
        const game = this.games.get(gameId);
        if (!game)
            return false;
        // Determine which player made the move
        const isPlayer1 = game.player1.id === playerId;
        const isPlayer2 = game.player2.id === playerId;
        if (!isPlayer1 && !isPlayer2)
            return false;
        // Record the move
        if (isPlayer1) {
            game.moves.player1 = move;
        }
        else {
            game.moves.player2 = move;
        }
        return true;
    }
    // Calculer le résultat sans modifier les scores (pour éviter les appels multiples)
    getWinner(gameId) {
        const game = this.games.get(gameId);
        if (!game || !game.moves.player1 || !game.moves.player2) {
            return null;
        }
        const player1Move = game.moves.player1;
        const player2Move = game.moves.player2;
        if (player1Move === player2Move) {
            return "draw";
        }
        else if ((player1Move === "stone" && player2Move === "scissors") ||
            (player1Move === "paper" && player2Move === "stone") ||
            (player1Move === "scissors" && player2Move === "paper")) {
            return "player1";
        }
        else {
            return "player2";
        }
    }
    // Calculer le résultat ET mettre à jour les scores (appeler une seule fois par round)
    calculateRoundResult(gameId) {
        const winner = this.getWinner(gameId);
        if (winner === null)
            return null;
        const game = this.games.get(gameId);
        if (!game)
            return null;
        // Incrémenter le score du gagnant (une seule fois)
        if (winner === "player1") {
            game.scores.player1 += 1;
            return "Win";
        }
        else if (winner === "player2") {
            game.scores.player2 += 1;
            return "Loose";
        }
        return "Draw";
    }
    // Obtenir le résultat pour un joueur spécifique (sans modifier les scores)
    getRoundResultForPlayer(gameId, playerId) {
        const game = this.games.get(gameId);
        if (!game)
            return null;
        const winner = this.getWinner(gameId);
        if (winner === null)
            return null;
        const isPlayer1 = game.player1.id === playerId;
        if (winner === "draw")
            return "Draw";
        if (winner === "player1") {
            return isPlayer1 ? "Win" : "Loose";
        }
        if (winner === "player2") {
            return isPlayer1 ? "Loose" : "Win";
        }
        return null;
    }
    startNewRound(gameId) {
        const game = this.games.get(gameId);
        if (!game)
            return false;
        game.currentRound += 1;
        game.moves = {};
        game.roundStarted = true;
        return true;
    }
    endGame(gameId) {
        const game = this.games.get(gameId);
        if (!game)
            return false;
        // Update player statuses back to available
        PlayerService_1.default.updatePlayerStatus(game.player1.id, "available");
        PlayerService_1.default.updatePlayerStatus(game.player2.id, "available");
        // Nettoyer les données de synchronisation
        this.games.delete(gameId);
        this.roundPhases.delete(gameId);
        this.roundTimestamps.delete(gameId);
        return true;
    }
    getGameByPlayerId(playerId) {
        for (const game of this.games.values()) {
            if (game.player1.id === playerId || game.player2.id === playerId) {
                return game;
            }
        }
        return undefined;
    }
    getOpponent(gameId, playerId) {
        const game = this.games.get(gameId);
        if (!game)
            return undefined;
        if (game.player1.id === playerId) {
            return game.player2;
        }
        else if (game.player2.id === playerId) {
            return game.player1;
        }
        return undefined;
    }
}
exports.default = new GameService();
//# sourceMappingURL=GameService.js.map