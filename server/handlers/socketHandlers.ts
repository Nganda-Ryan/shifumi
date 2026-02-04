import { WebSocket } from "ws";
import PlayerService from "../services/PlayerService";
import GameService from "../services/GameService";
import InvitationService from "../services/InvitationService";
import {
  ClientMessage,
  ConnectMessage,
  InviteMessage,
  AcceptInvitationMessage,
  DeclineInvitationMessage,
  MoveMessage,
  StartRoundMessage,
  LeaveGameMessage,
  UpdateUsernameMessage,
  ServerMessage,
} from "../types/game.types";

interface SocketWithPlayer extends WebSocket {
  playerId?: string;
  sessionId?: string;
  id?: string;
}

export function handleConnection(socket: SocketWithPlayer): void {
  console.log("New client connected");

  socket.on("message", (data: Buffer) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString());
      handleMessage(socket, message);
    } catch (error) {
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

function handleMessage(socket: SocketWithPlayer, message: ClientMessage): void {
  switch (message.type) {
    case "connect":
      handleConnect(socket, message as ConnectMessage);
      break;
    case "game:invite":
      handleInvite(socket, message as InviteMessage);
      break;
    case "game:invitation:accept":
      handleAcceptInvitation(socket, message as AcceptInvitationMessage);
      break;
    case "game:invitation:decline":
      handleDeclineInvitation(socket, message as DeclineInvitationMessage);
      break;
    case "game:move":
      handleMove(socket, message as MoveMessage);
      break;
    case "game:start:round":
      handleStartRound(socket, message as StartRoundMessage);
      break;
    case "game:leave":
      handleLeaveGame(socket, message as LeaveGameMessage);
      break;
    case "player:update:username":
      handleUpdateUsername(socket, message as UpdateUsernameMessage);
      break;
    default:
      sendError(socket, `Unknown message type: ${message.type}`);
  }
}

function handleConnect(socket: SocketWithPlayer, message: ConnectMessage): void {
  const { sessionId, username } = message.payload;

  // Check if player already exists with this session
  let player = PlayerService.getPlayerBySessionId(sessionId);

  const socketId = (socket as any).id || "";

  if (player) {
    // Close any existing socket for this player (prevents duplicate connections from multiple tabs)
    const existingSocket = findSocketByPlayerId(player.id);
    if (existingSocket && existingSocket !== socket) {
      console.log(`Closing duplicate connection for player ${player.id}`);
      existingSocket.close(1000, "New connection from same session");
    }

    // Update socket ID for existing player
    PlayerService.updatePlayerSocketId(player.id, socketId);
    // Update username if provided (reconnection with updated profile)
    if (username) {
      PlayerService.updatePlayerUsername(player.id, username);
    }
    socket.playerId = player.id;
    socket.sessionId = sessionId;
  } else {
    // Register new player
    player = PlayerService.registerPlayer(sessionId, username, socketId);
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

function handleUpdateUsername(socket: SocketWithPlayer, message: UpdateUsernameMessage): void {
  if (!socket.playerId) {
    sendError(socket, "Not connected");
    return;
  }

  const { username } = message.payload;
  const success = PlayerService.updatePlayerUsername(socket.playerId, username);

  if (success) {
    // Broadcast updated players list to all clients
    broadcastPlayersList();
  }
}

function handleInvite(socket: SocketWithPlayer, message: InviteMessage): void {
  if (!socket.playerId) {
    sendError(socket, "Not connected");
    return;
  }

  const { targetPlayerId } = message.payload;
  const fromPlayer = PlayerService.getPlayer(socket.playerId);
  const toPlayer = PlayerService.getPlayer(targetPlayerId);

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

  const invitation = InvitationService.createInvitation(fromPlayer, toPlayer);

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

function handleAcceptInvitation(
  socket: SocketWithPlayer,
  message: AcceptInvitationMessage
): void {
  if (!socket.playerId) {
    sendError(socket, "Not connected");
    return;
  }

  const { invitationId } = message.payload;
  const invitation = InvitationService.acceptInvitation(invitationId);

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
  const game = GameService.createGame(invitation.from, invitation.to);

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
  InvitationService.removeInvitation(invitationId);
  broadcastPlayersList();
}

function handleDeclineInvitation(
  socket: SocketWithPlayer,
  message: DeclineInvitationMessage
): void {
  if (!socket.playerId) {
    sendError(socket, "Not connected");
    return;
  }

  const { invitationId } = message.payload;
  const invitation = InvitationService.declineInvitation(invitationId);

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

function handleMove(socket: SocketWithPlayer, message: MoveMessage): void {
  if (!socket.playerId) {
    sendError(socket, "Not connected");
    return;
  }

  const { gameId, move } = message.payload;
  const game = GameService.getGame(gameId);

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
  const phase = GameService.getRoundPhase(gameId);
  if (phase === "result" || phase === "idle") {
    console.log(`Move rejected: round phase is ${phase}`);
    return; // Ignorer silencieusement les moves hors phase
  }
  // Accepter les moves pendant "pre-countdown" et "shi-fu-mi"

  // Record move (le joueur peut changer jusqu'à la fin)
  const success = GameService.recordMove(gameId, socket.playerId, move);
  if (!success) {
    sendError(socket, "Failed to record move");
    return;
  }

  // NE PAS calculer le résultat ici - le serveur gère le timing
  console.log(`Move recorded for player ${socket.playerId}: ${move}`);
}

// Durées en millisecondes
const PRE_COUNTDOWN_DURATION = 5000; // 5 secondes de pré-countdown
const SHI_FU_MI_DURATION = 3000;     // 3 secondes de SHI FU MI
const GRACE_PERIOD = 500;            // 500ms de délai de grâce pour la latence

function handleStartRound(
  socket: SocketWithPlayer,
  message: StartRoundMessage
): void {
  console.log("handleStartRound called", message.payload);
  if (!socket.playerId) {
    sendError(socket, "Not connected");
    return;
  }

  const { gameId } = message.payload;
  const game = GameService.getGame(gameId);
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
  const currentPhase = GameService.getRoundPhase(gameId);
  if (currentPhase !== "idle" && currentPhase !== "result") {
    console.log("Round already in progress, phase:", currentPhase);
    sendError(socket, "A round is already in progress");
    return;
  }

  console.log("Starting new round");
  // Start new round et mettre en phase pre-countdown
  GameService.startNewRound(gameId);
  GameService.setRoundPhase(gameId, "pre-countdown");

  const roundStartTimestamp = Date.now();

  // Fonction helper pour envoyer aux deux joueurs (re-cherche les sockets à chaque fois)
  const sendToBothPlayers = (messageObj: ServerMessage) => {
    const p1Socket = findSocketByPlayerId(game.player1.id);
    const p2Socket = findSocketByPlayerId(game.player2.id);
    if (p1Socket) sendMessage(p1Socket, messageObj);
    if (p2Socket) sendMessage(p2Socket, messageObj);
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
    const currentGame = GameService.getGame(gameId);
    if (!currentGame) {
      console.log("Game no longer exists");
      return;
    }

    GameService.setRoundPhase(gameId, "shi-fu-mi");

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
function calculateAndSendResults(gameId: string, player1Id: string, player2Id: string): void {
  const currentGame = GameService.getGame(gameId);
  if (!currentGame) {
    console.log("Game no longer exists for results");
    return;
  }

  // Mettre en phase result
  GameService.setRoundPhase(gameId, "result");

  // Appliquer les moves par défaut pour les joueurs qui n'ont pas joué
  GameService.applyDefaultMoves(gameId);

  // Calculer le résultat
  const result = GameService.calculateRoundResult(gameId);
  const player1Result = GameService.getRoundResultForPlayer(gameId, player1Id);
  const player2Result = GameService.getRoundResultForPlayer(gameId, player2Id);

  // Récupérer le jeu mis à jour avec les scores
  const updatedGame = GameService.getGame(gameId);
  if (!updatedGame) return;

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
    GameService.setRoundPhase(gameId, "idle");
  }, 3000);
}

function handleLeaveGame(socket: SocketWithPlayer, message: LeaveGameMessage): void {
  if (!socket.playerId) {
    sendError(socket, "Not connected");
    return;
  }

  const { gameId } = message.payload;
  const game = GameService.getGame(gameId);

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
  const opponent = GameService.getOpponent(gameId, socket.playerId);
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
  GameService.endGame(gameId);
  broadcastPlayersList();
}

function handleDisconnect(socket: SocketWithPlayer): void {
  if (socket.playerId) {
    console.log(`Player ${socket.playerId} disconnected`);

    // Find and end any active games
    const game = GameService.getGameByPlayerId(socket.playerId);
    if (game) {
      // Notify opponent
      const opponent = GameService.getOpponent(game.id, socket.playerId);
      if (opponent) {
        const opponentSocket = findSocketByPlayerId(opponent.id);
        if (opponentSocket) {
          sendMessage(opponentSocket, {
            type: "game:opponent:disconnected",
            payload: { gameId: game.id },
          });
        }
      }
      GameService.endGame(game.id);
    }

    // Remove player
    PlayerService.removePlayer(socket.playerId);
    broadcastPlayersList();
  }
}

// Helper functions
function sendMessage(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function sendError(socket: WebSocket, message: string, code?: string): void {
  sendMessage(socket, {
    type: "error",
    payload: { message, code },
  });
}

// Store all connected sockets
const connectedSockets: Map<string, SocketWithPlayer> = new Map();

export function registerSocket(socket: SocketWithPlayer): void {
  const socketId = socket.id || Math.random().toString(36).substring(7);
  (socket as any).id = socketId;
  connectedSockets.set(socketId, socket);
}

export function unregisterSocket(socket: SocketWithPlayer): void {
  const socketId = (socket as any).id;
  if (socketId) {
    connectedSockets.delete(socketId);
  }
}

function findSocketByPlayerId(playerId: string): SocketWithPlayer | undefined {
  for (const socket of connectedSockets.values()) {
    if (socket.playerId === playerId) {
      return socket;
    }
  }
  return undefined;
}

function broadcastPlayersList(): void {
  // Only include players who have set a username (exclude anonymous/unknown players)
  const availablePlayers = PlayerService.getAvailablePlayers().filter(
    (player) => player.username && player.username.trim().length > 0
  );
  const message: ServerMessage = {
    type: "players:list",
    payload: { players: availablePlayers },
  };

  for (const socket of connectedSockets.values()) {
    if (socket.readyState === WebSocket.OPEN) {
      sendMessage(socket, message);
    }
  }
}

