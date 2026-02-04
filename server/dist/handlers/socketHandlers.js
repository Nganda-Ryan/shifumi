"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleConnection = handleConnection;
exports.registerSocket = registerSocket;
exports.unregisterSocket = unregisterSocket;
const ws_1 = require("ws");
const PlayerService_1 = __importDefault(require("../services/PlayerService"));
const GameService_1 = __importDefault(require("../services/GameService"));
const InvitationService_1 = __importDefault(require("../services/InvitationService"));
function handleConnection(socket) {
    console.log("New client connected");
    socket.on("message", (data) => {
        try {
            const message = JSON.parse(data.toString());
            handleMessage(socket, message);
        }
        catch (error) {
            console.error("Error parsing message:", error);
            sendError(socket, "Invalid message format");
        }
    });
    socket.on("close", () => {
        handleDisconnect(socket);
    });
    socket.on("error", (error) => {
        console.error("WebSocket error:", error);
        handleDisconnect(socket);
    });
}
function handleMessage(socket, message) {
    switch (message.type) {
        case "connect":
            handleConnect(socket, message);
            break;
        case "game:invite":
            handleInvite(socket, message);
            break;
        case "game:invitation:accept":
            handleAcceptInvitation(socket, message);
            break;
        case "game:invitation:decline":
            handleDeclineInvitation(socket, message);
            break;
        case "game:move":
            handleMove(socket, message);
            break;
        case "game:start:round":
            handleStartRound(socket, message);
            break;
        case "game:leave":
            handleLeaveGame(socket, message);
            break;
        case "player:update:username":
            handleUpdateUsername(socket, message);
            break;
        default:
            sendError(socket, `Unknown message type: ${message.type}`);
    }
}
function handleConnect(socket, message) {
    const { sessionId, username } = message.payload;
    // Check if player already exists with this session
    let player = PlayerService_1.default.getPlayerBySessionId(sessionId);
    const socketId = socket.id || "";
    if (player) {
        // Update socket ID for existing player
        PlayerService_1.default.updatePlayerSocketId(player.id, socketId);
        socket.playerId = player.id;
        socket.sessionId = sessionId;
    }
    else {
        // Register new player
        player = PlayerService_1.default.registerPlayer(sessionId, username, socketId);
        socket.playerId = player.id;
        socket.sessionId = sessionId;
    }
    // Send connection success
    sendMessage(socket, {
        type: "connection:success",
        payload: { playerId: player.id },
    });
    // Send list of available players
    broadcastPlayersList();
}
function handleUpdateUsername(socket, message) {
    if (!socket.playerId) {
        sendError(socket, "Not connected");
        return;
    }
    const { username } = message.payload;
    const success = PlayerService_1.default.updatePlayerUsername(socket.playerId, username);
    if (success) {
        // Broadcast updated players list to all clients
        broadcastPlayersList();
    }
}
function handleInvite(socket, message) {
    if (!socket.playerId) {
        sendError(socket, "Not connected");
        return;
    }
    const { targetPlayerId } = message.payload;
    const fromPlayer = PlayerService_1.default.getPlayer(socket.playerId);
    const toPlayer = PlayerService_1.default.getPlayer(targetPlayerId);
    if (!fromPlayer) {
        sendError(socket, "Player not found");
        return;
    }
    if (!toPlayer) {
        sendError(socket, "Target player not found");
        return;
    }
    if (toPlayer.status !== "available") {
        sendError(socket, "Player is not available");
        return;
    }
    const invitation = InvitationService_1.default.createInvitation(fromPlayer, toPlayer);
    // Send invitation to target player
    const targetSocket = findSocketByPlayerId(targetPlayerId);
    if (targetSocket) {
        sendMessage(targetSocket, {
            type: "game:invitation:received",
            payload: { invitation },
        });
    }
    broadcastPlayersList();
}
function handleAcceptInvitation(socket, message) {
    if (!socket.playerId) {
        sendError(socket, "Not connected");
        return;
    }
    const { invitationId } = message.payload;
    const invitation = InvitationService_1.default.acceptInvitation(invitationId);
    if (!invitation) {
        sendError(socket, "Invalid or expired invitation");
        return;
    }
    // Verify that the accepting player is the one who received the invitation
    if (invitation.to.id !== socket.playerId) {
        sendError(socket, "You are not the recipient of this invitation");
        return;
    }
    // Create game
    const game = GameService_1.default.createGame(invitation.from, invitation.to);
    // Notify both players
    const fromSocket = findSocketByPlayerId(invitation.from.id);
    const toSocket = findSocketByPlayerId(invitation.to.id);
    if (fromSocket) {
        sendMessage(fromSocket, {
            type: "game:started",
            payload: {
                gameId: game.id,
                game,
                opponent: invitation.to,
            },
        });
    }
    if (toSocket) {
        sendMessage(toSocket, {
            type: "game:started",
            payload: {
                gameId: game.id,
                game,
                opponent: invitation.from,
            },
        });
    }
    // Clean up invitation
    InvitationService_1.default.removeInvitation(invitationId);
    broadcastPlayersList();
}
function handleDeclineInvitation(socket, message) {
    if (!socket.playerId) {
        sendError(socket, "Not connected");
        return;
    }
    const { invitationId } = message.payload;
    const invitation = InvitationService_1.default.declineInvitation(invitationId);
    if (!invitation) {
        sendError(socket, "Invalid invitation");
        return;
    }
    // Notify the inviting player
    const fromSocket = findSocketByPlayerId(invitation.from.id);
    if (fromSocket) {
        sendMessage(fromSocket, {
            type: "game:invitation:declined",
            payload: { invitationId },
        });
    }
    broadcastPlayersList();
}
function handleMove(socket, message) {
    if (!socket.playerId) {
        sendError(socket, "Not connected");
        return;
    }
    const { gameId, move } = message.payload;
    const game = GameService_1.default.getGame(gameId);
    if (!game) {
        sendError(socket, "Game not found");
        return;
    }
    // Verify player is in this game
    if (game.player1.id !== socket.playerId && game.player2.id !== socket.playerId) {
        sendError(socket, "You are not part of this game");
        return;
    }
    // Vérifier que le round est en phase de jeu (pre-countdown ou shi-fu-mi)
    // Les joueurs peuvent changer leur choix pendant ces deux phases
    const phase = GameService_1.default.getRoundPhase(gameId);
    if (phase === "result" || phase === "idle") {
        console.log(`Move rejected: round phase is ${phase}`);
        return; // Ignorer silencieusement les moves hors phase
    }
    // Accepter les moves pendant "pre-countdown" et "shi-fu-mi"
    // Record move (le joueur peut changer jusqu'à la fin)
    const success = GameService_1.default.recordMove(gameId, socket.playerId, move);
    if (!success) {
        sendError(socket, "Failed to record move");
        return;
    }
    // NE PAS calculer le résultat ici - le serveur gère le timing
    console.log(`Move recorded for player ${socket.playerId}: ${move}`);
}
// Durées en millisecondes
const PRE_COUNTDOWN_DURATION = 5000; // 5 secondes de pré-countdown
const SHI_FU_MI_DURATION = 3000; // 3 secondes de SHI FU MI
const GRACE_PERIOD = 500; // 500ms de délai de grâce pour la latence
function handleStartRound(socket, message) {
    console.log("handleStartRound called", message.payload);
    if (!socket.playerId) {
        sendError(socket, "Not connected");
        return;
    }
    const { gameId } = message.payload;
    const game = GameService_1.default.getGame(gameId);
    console.log("Game found:", game ? "yes" : "no", "Player ID:", socket.playerId);
    if (!game) {
        sendError(socket, "Game not found");
        return;
    }
    // Verify player is in this game
    if (game.player1.id !== socket.playerId && game.player2.id !== socket.playerId) {
        sendError(socket, "You are not part of this game");
        return;
    }
    // Only player1 (the owner who sent the invitation) can start the round
    console.log("Checking owner:", "player1.id:", game.player1.id, "socket.playerId:", socket.playerId);
    if (game.player1.id !== socket.playerId) {
        console.log("Not the owner, sending error");
        sendError(socket, "Only the game owner can start the round");
        return;
    }
    // Vérifier qu'un round n'est pas déjà en cours
    const currentPhase = GameService_1.default.getRoundPhase(gameId);
    if (currentPhase !== "idle" && currentPhase !== "result") {
        console.log("Round already in progress, phase:", currentPhase);
        sendError(socket, "A round is already in progress");
        return;
    }
    console.log("Starting new round");
    // Start new round et mettre en phase pre-countdown
    GameService_1.default.startNewRound(gameId);
    GameService_1.default.setRoundPhase(gameId, "pre-countdown");
    const roundStartTimestamp = Date.now();
    // Fonction helper pour envoyer aux deux joueurs (re-cherche les sockets à chaque fois)
    const sendToBothPlayers = (messageObj) => {
        const p1Socket = findSocketByPlayerId(game.player1.id);
        const p2Socket = findSocketByPlayerId(game.player2.id);
        if (p1Socket)
            sendMessage(p1Socket, messageObj);
        if (p2Socket)
            sendMessage(p2Socket, messageObj);
    };
    // Envoyer round:starting avec le timestamp pour synchronisation
    sendToBothPlayers({
        type: "game:round:starting",
        payload: {
            gameId,
            timestamp: roundStartTimestamp,
            preCountdownDuration: PRE_COUNTDOWN_DURATION,
            shiFuMiDuration: SHI_FU_MI_DURATION
        },
    });
    // Après 5 secondes: démarrer le countdown SHI FU MI
    setTimeout(() => {
        // Vérifier que le jeu existe toujours
        const currentGame = GameService_1.default.getGame(gameId);
        if (!currentGame) {
            console.log("Game no longer exists");
            return;
        }
        GameService_1.default.setRoundPhase(gameId, "shi-fu-mi");
        sendToBothPlayers({
            type: "game:round:started",
            payload: {
                gameId,
                timestamp: Date.now()
            },
        });
        // Après 3 secondes + délai de grâce: calculer et envoyer les résultats
        setTimeout(() => {
            calculateAndSendResults(gameId, game.player1.id, game.player2.id);
        }, SHI_FU_MI_DURATION + GRACE_PERIOD);
    }, PRE_COUNTDOWN_DURATION);
}
// Fonction pour calculer et envoyer les résultats aux deux joueurs
function calculateAndSendResults(gameId, player1Id, player2Id) {
    const currentGame = GameService_1.default.getGame(gameId);
    if (!currentGame) {
        console.log("Game no longer exists for results");
        return;
    }
    // Mettre en phase result
    GameService_1.default.setRoundPhase(gameId, "result");
    // Appliquer les moves par défaut pour les joueurs qui n'ont pas joué
    GameService_1.default.applyDefaultMoves(gameId);
    // Calculer le résultat
    const result = GameService_1.default.calculateRoundResult(gameId);
    const player1Result = GameService_1.default.getRoundResultForPlayer(gameId, player1Id);
    const player2Result = GameService_1.default.getRoundResultForPlayer(gameId, player2Id);
    // Récupérer le jeu mis à jour avec les scores
    const updatedGame = GameService_1.default.getGame(gameId);
    if (!updatedGame)
        return;
    console.log("Sending results:", {
        result,
        player1Result,
        player2Result,
        moves: updatedGame.moves,
        scores: updatedGame.scores
    });
    // Envoyer les résultats aux deux joueurs EN MÊME TEMPS
    const player1Socket = findSocketByPlayerId(player1Id);
    const player2Socket = findSocketByPlayerId(player2Id);
    const basePayload = {
        gameId,
        result,
        scores: updatedGame.scores,
        moves: {
            player1: updatedGame.moves.player1,
            player2: updatedGame.moves.player2,
        },
    };
    if (player1Socket) {
        sendMessage(player1Socket, {
            type: "game:round:result",
            payload: { ...basePayload, yourResult: player1Result },
        });
    }
    if (player2Socket) {
        sendMessage(player2Socket, {
            type: "game:round:result",
            payload: { ...basePayload, yourResult: player2Result },
        });
    }
    // Remettre en phase idle après un délai pour permettre au joueur de voir les résultats
    setTimeout(() => {
        GameService_1.default.setRoundPhase(gameId, "idle");
    }, 3000);
}
function handleLeaveGame(socket, message) {
    if (!socket.playerId) {
        sendError(socket, "Not connected");
        return;
    }
    const { gameId } = message.payload;
    const game = GameService_1.default.getGame(gameId);
    if (!game) {
        sendError(socket, "Game not found");
        return;
    }
    // Verify player is in this game
    if (game.player1.id !== socket.playerId && game.player2.id !== socket.playerId) {
        sendError(socket, "You are not part of this game");
        return;
    }
    console.log(`Player ${socket.playerId} left game ${gameId}`);
    // Notify opponent
    const opponent = GameService_1.default.getOpponent(gameId, socket.playerId);
    if (opponent) {
        const opponentSocket = findSocketByPlayerId(opponent.id);
        if (opponentSocket) {
            sendMessage(opponentSocket, {
                type: "game:opponent:left",
                payload: { gameId },
            });
        }
    }
    // Confirm to the leaving player
    sendMessage(socket, {
        type: "game:left",
        payload: { gameId },
    });
    // End the game
    GameService_1.default.endGame(gameId);
    broadcastPlayersList();
}
function handleDisconnect(socket) {
    if (socket.playerId) {
        console.log(`Player ${socket.playerId} disconnected`);
        // Find and end any active games
        const game = GameService_1.default.getGameByPlayerId(socket.playerId);
        if (game) {
            // Notify opponent
            const opponent = GameService_1.default.getOpponent(game.id, socket.playerId);
            if (opponent) {
                const opponentSocket = findSocketByPlayerId(opponent.id);
                if (opponentSocket) {
                    sendMessage(opponentSocket, {
                        type: "game:opponent:disconnected",
                        payload: { gameId: game.id },
                    });
                }
            }
            GameService_1.default.endGame(game.id);
        }
        // Remove player
        PlayerService_1.default.removePlayer(socket.playerId);
        broadcastPlayersList();
    }
}
// Helper functions
function sendMessage(socket, message) {
    if (socket.readyState === ws_1.WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    }
}
function sendError(socket, message, code) {
    sendMessage(socket, {
        type: "error",
        payload: { message, code },
    });
}
// Store all connected sockets
const connectedSockets = new Map();
function registerSocket(socket) {
    const socketId = socket.id || Math.random().toString(36).substring(7);
    socket.id = socketId;
    connectedSockets.set(socketId, socket);
}
function unregisterSocket(socket) {
    const socketId = socket.id;
    if (socketId) {
        connectedSockets.delete(socketId);
    }
}
function findSocketByPlayerId(playerId) {
    for (const socket of connectedSockets.values()) {
        if (socket.playerId === playerId) {
            return socket;
        }
    }
    return undefined;
}
function broadcastPlayersList() {
    const availablePlayers = PlayerService_1.default.getAvailablePlayers();
    const message = {
        type: "players:list",
        payload: { players: availablePlayers },
    };
    for (const socket of connectedSockets.values()) {
        if (socket.readyState === ws_1.WebSocket.OPEN) {
            sendMessage(socket, message);
        }
    }
}
//# sourceMappingURL=socketHandlers.js.map