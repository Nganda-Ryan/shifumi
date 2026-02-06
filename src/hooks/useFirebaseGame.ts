"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  ref,
  set,
  get,
  push,
  update,
  remove,
  onValue,
  onDisconnect,
  off,
  DataSnapshot,
  serverTimestamp,
} from "firebase/database";
import { database } from "@/lib/firebase";
import { Player, Game, Invitation } from "@/types/GameState";
import { Move } from "@/types/Move";

const SESSION_ID_KEY = "shifumi_session_id";

function getSessionId(): string {
  if (typeof window === "undefined") return uuidv4();

  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

interface RoundResult {
  result: string;
  yourResult: string;
  scores: { player1: number; player2: number };
}

interface UseFirebaseGameReturn {
  isConnected: boolean;
  isConnecting: boolean;
  players: Player[];
  currentGame: Game | null;
  invitations: Invitation[];
  playerId: string | null;
  error: string | null;
  roundResult: RoundResult | null;
  roundStarted: boolean;
  roundStartTimestamp: number | null;
  serverTimeOffset: number;
  readyTimestamp: number | null;
  invitePlayer: (targetPlayerId: string) => void;
  acceptInvitation: (invitationId: string) => void;
  declineInvitation: (invitationId: string) => void;
  sendMove: (gameId: string, move: string) => void;
  startRound: (gameId: string) => void;
  leaveGame: (gameId: string) => void;
  connect: (username?: string) => void;
  disconnect: () => void;
  updateUsername: (username: string) => void;
}

// Determine winner
function determineWinner(move1: Move, move2: Move): "player1" | "player2" | "draw" {
  if (move1 === move2) return "draw";
  if (
    (move1 === "stone" && move2 === "scissors") ||
    (move1 === "scissors" && move2 === "paper") ||
    (move1 === "paper" && move2 === "stone")
  ) {
    return "player1";
  }
  return "player2";
}

export function useFirebaseGame(): UseFirebaseGameReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [roundStarted, setRoundStarted] = useState(false);
  const [roundStartTimestamp, setRoundStartTimestamp] = useState<number | null>(null);
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [readyTimestamp, setReadyTimestamp] = useState<number | null>(null);

  const sessionIdRef = useRef<string>("");
  const playerIdRef = useRef<string | null>(null);
  const currentGameIdRef = useRef<string | null>(null);
  const hasProcessedResultRef = useRef<string | null>(null);
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverTimeOffsetRef = useRef<number>(0);
  const gamesListenerInstalledRef = useRef<boolean>(false);

  // Connect to Firebase
  const connect = useCallback(async (username?: string) => {
    if (isConnected || isConnecting) return;

    // Check if database is available
    if (!database) {
      setError("Firebase not configured");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      sessionIdRef.current = getSessionId();

      // Check if player already exists with this sessionId
      const playersRef = ref(database, "players");
      const snapshot = await get(playersRef);
      let existingPlayerId: string | null = null;

      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const player = child.val();
          if (player.sessionId === sessionIdRef.current) {
            existingPlayerId = child.key;
          }
        });
      }

      const id = existingPlayerId || uuidv4();
      playerIdRef.current = id;
      setPlayerId(id);

      const playerRef = ref(database, `players/${id}`);
      const playerData: Player = {
        id,
        sessionId: sessionIdRef.current,
        username: username || `Player_${id.slice(0, 6)}`,
        status: "available",
      };

      await set(playerRef, playerData);

      // Set up presence system
      const connectedRef = ref(database, ".info/connected");
      onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
          setIsConnected(true);
          setIsConnecting(false);

          // When disconnected, remove player
          onDisconnect(playerRef).remove();
        } else {
          setIsConnected(false);
        }
      });

      // Listen for server time offset (for synchronized countdown)
      const offsetRef = ref(database, ".info/serverTimeOffset");
      onValue(offsetRef, (snap) => {
        const offset = snap.val() || 0;
        serverTimeOffsetRef.current = offset;
        setServerTimeOffset(offset);
      });

      // Listen for players list
      onValue(playersRef, (snapshot) => {
        const playersList: Player[] = [];
        snapshot.forEach((child) => {
          const player = child.val();
          // Skip current player and validate player data
          if (
            child.key !== playerIdRef.current &&
            player &&
            player.username &&
            player.sessionId
          ) {
            playersList.push({ ...player, id: child.key });
          }
        });
        setPlayers(playersList);
      });

      // Listen for invitations
      const invitationsRef = ref(database, "invitations");
      onValue(invitationsRef, (snapshot) => {
        const invitationsList: Invitation[] = [];
        snapshot.forEach((child) => {
          const inv = child.val();
          // Only show pending invitations for this player
          if (inv.to?.id === playerIdRef.current && inv.status === "pending") {
            invitationsList.push({ ...inv, id: child.key });
          }
        });
        setInvitations(invitationsList);
      });

    } catch (err) {
      console.error("Firebase connection error:", err);
      setError("Failed to connect to server");
      setIsConnecting(false);
    }
  }, [isConnected, isConnecting]);

  // Disconnect from Firebase
  const disconnect = useCallback(async () => {
    if (!database) return;

    if (playerIdRef.current) {
      const playerRef = ref(database, `players/${playerIdRef.current}`);
      await remove(playerRef);
    }

    // Clean up listeners
    off(ref(database, "players"));
    off(ref(database, "invitations"));
    off(ref(database, ".info/connected"));
    off(ref(database, ".info/serverTimeOffset"));

    setIsConnected(false);
    setPlayers([]);
    setCurrentGame(null);
    setInvitations([]);
    setPlayerId(null);
    playerIdRef.current = null;
  }, []);

  // Get estimated server time (corrected for clock skew)
  const getServerTime = useCallback(() => {
    return Date.now() + serverTimeOffsetRef.current;
  }, []);

  // Start listening to game updates
  const startGameListener = useCallback((gameId: string) => {
    if (!database) return;

    const gameRef = ref(database, `games/${gameId}`);

    onValue(gameRef, (snapshot: DataSnapshot) => {
      if (!snapshot.exists()) {
        // Game was deleted (opponent left)
        if (resultTimeoutRef.current) {
          clearTimeout(resultTimeoutRef.current);
          resultTimeoutRef.current = null;
        }
        setCurrentGame(null);
        setRoundStarted(false);
        setRoundResult(null);
        currentGameIdRef.current = null;
        setError("Your opponent left the game.");
        return;
      }

      const gameData = snapshot.val();
      const game: Game = {
        id: gameId,
        player1: gameData.player1,
        player2: gameData.player2,
        scores: gameData.scores,
        currentRound: gameData.currentRound,
        moves: gameData.moves || {},
        roundStarted: gameData.roundStatus === "playing",
      };

      setCurrentGame(game);

      // Handle round status
      if (gameData.roundStatus === "ready") {
        // Show "Ready?" phase - store timestamp for UI sync
        setReadyTimestamp(gameData.readyTimestamp);
        setRoundStarted(false);

        // Clear any existing timeouts
        if (readyTimeoutRef.current) {
          clearTimeout(readyTimeoutRef.current);
          readyTimeoutRef.current = null;
        }

        // Only player1 transitions to "playing" after 900ms
        const isPlayer1 = gameData.player1.id === playerIdRef.current;
        if (isPlayer1 && gameData.readyTimestamp) {
          const serverTime = getServerTime();
          const elapsed = serverTime - gameData.readyTimestamp;
          const readyDuration = 900; // 900ms for "Ready?"
          const timeUntilPlay = Math.max(0, readyDuration - elapsed);

          readyTimeoutRef.current = setTimeout(async () => {
            // Get current server time and add sync delay so both players start together
            const SYNC_DELAY = 150; // 150ms buffer for network latency
            const startTime = Date.now() + serverTimeOffsetRef.current + SYNC_DELAY;

            await update(gameRef, {
              roundStatus: "playing",
              roundStartTimestamp: startTime,
            });
          }, timeUntilPlay);
        }
      } else if (gameData.roundStatus === "playing") {
        setReadyTimestamp(null);
        setRoundStarted(true);
        setRoundStartTimestamp(gameData.roundStartTimestamp);

        // Clear any existing timeouts
        if (readyTimeoutRef.current) {
          clearTimeout(readyTimeoutRef.current);
          readyTimeoutRef.current = null;
        }
        if (resultTimeoutRef.current) {
          clearTimeout(resultTimeoutRef.current);
          resultTimeoutRef.current = null;
        }

        // Only player1 calculates the result (avoids race conditions)
        const isPlayer1 = gameData.player1.id === playerIdRef.current;
        if (isPlayer1 && gameData.roundStartTimestamp) {
          const serverTime = getServerTime();
          const elapsed = serverTime - gameData.roundStartTimestamp;
          const countdownDuration = 3000; // 3 seconds
          const timeUntilEnd = Math.max(0, countdownDuration - elapsed + 100); // +100ms buffer

          resultTimeoutRef.current = setTimeout(async () => {
            // Re-fetch game state to get final moves
            const finalSnapshot = await get(gameRef);
            if (!finalSnapshot.exists()) return;

            const finalData = finalSnapshot.val();
            if (finalData.roundStatus !== "playing" || finalData.resultCalculated) {
              return;
            }

            const moves = finalData.moves || {};
            const DEFAULT_MOVE: Move = "stone";
            const player1Move = moves.player1 || DEFAULT_MOVE;
            const player2Move = moves.player2 || DEFAULT_MOVE;

            const winner = determineWinner(player1Move, player2Move);
            const newScores = { ...finalData.scores };
            if (winner === "player1") {
              newScores.player1 += 1;
            } else if (winner === "player2") {
              newScores.player2 += 1;
            }

            await update(gameRef, {
              resultCalculated: true,
              scores: newScores,
              roundStatus: "finished",
              "moves/player1": player1Move,
              "moves/player2": player2Move,
            });
          }, timeUntilEnd);
        }
      } else if (gameData.roundStatus === "finished") {
        // Clear timeouts when round is finished
        if (resultTimeoutRef.current) {
          clearTimeout(resultTimeoutRef.current);
          resultTimeoutRef.current = null;
        }
        if (readyTimeoutRef.current) {
          clearTimeout(readyTimeoutRef.current);
          readyTimeoutRef.current = null;
        }

        setReadyTimestamp(null);

        // Process result for display
        const moves = gameData.moves || {};
        if (moves.player1 && moves.player2 && playerIdRef.current) {
          const resultKey = `${gameId}-${gameData.currentRound}`;

          if (hasProcessedResultRef.current !== resultKey) {
            hasProcessedResultRef.current = resultKey;

            const winner = determineWinner(moves.player1, moves.player2);
            const isPlayer1 = game.player1.id === playerIdRef.current;

            let yourResult: string;
            if (winner === "draw") {
              yourResult = "Draw";
            } else if ((winner === "player1" && isPlayer1) || (winner === "player2" && !isPlayer1)) {
              yourResult = "Win";
            } else {
              yourResult = "Loose";
            }

            setRoundResult({
              result: winner,
              yourResult,
              scores: gameData.scores,
            });
          }
        }
        setRoundStarted(false);
      } else {
        // waiting or any other status
        if (resultTimeoutRef.current) {
          clearTimeout(resultTimeoutRef.current);
          resultTimeoutRef.current = null;
        }
        if (readyTimeoutRef.current) {
          clearTimeout(readyTimeoutRef.current);
          readyTimeoutRef.current = null;
        }
        setReadyTimestamp(null);
        setRoundStarted(false);
      }
    });
  }, [getServerTime]);

  // Invite a player
  const invitePlayer = useCallback(async (targetPlayerId: string) => {
    if (!playerIdRef.current || !database) return;

    try {
      const invitationsRef = ref(database, "invitations");
      const newInvRef = push(invitationsRef);

      // Get current player data
      const playerSnapshot = await get(ref(database, `players/${playerIdRef.current}`));
      const fromPlayer = playerSnapshot.val();

      // Get target player data
      const targetSnapshot = await get(ref(database, `players/${targetPlayerId}`));
      const toPlayer = targetSnapshot.val();

      if (!toPlayer) {
        setError("Player not found");
        return;
      }

      const invitation: Omit<Invitation, "id"> = {
        from: { ...fromPlayer, id: playerIdRef.current },
        to: { ...toPlayer, id: targetPlayerId },
        status: "pending",
        createdAt: Date.now(),
      };

      await set(newInvRef, invitation);

      // Update player statuses
      await update(ref(database, `players/${playerIdRef.current}`), { status: "invited" });
      await update(ref(database, `players/${targetPlayerId}`), { status: "invited" });

    } catch (err) {
      console.error("Error inviting player:", err);
      setError("Failed to send invitation");
    }
  }, []);

  // Accept invitation
  const acceptInvitation = useCallback(async (invitationId: string) => {
    if (!playerIdRef.current || !database) return;

    try {
      const invRef = ref(database, `invitations/${invitationId}`);
      const invSnapshot = await get(invRef);
      const invitation = invSnapshot.val();

      if (!invitation) {
        setError("Invitation not found");
        return;
      }

      // Create new game
      const gamesRef = ref(database, "games");
      const newGameRef = push(gamesRef);
      const gameId = newGameRef.key!;

      const game: Game = {
        id: gameId,
        player1: invitation.from,
        player2: { ...invitation.to, id: playerIdRef.current },
        scores: { player1: 0, player2: 0 },
        currentRound: 1,
        moves: {},
        roundStarted: false,
      };

      await set(newGameRef, {
        ...game,
        roundStatus: "waiting",
        preCountdownTimestamp: null,
        roundStartTimestamp: null,
      });

      // Update player statuses
      await update(ref(database, `players/${invitation.from.id}`), {
        status: "in-game",
        currentGameId: gameId,
      });
      await update(ref(database, `players/${playerIdRef.current}`), {
        status: "in-game",
        currentGameId: gameId,
      });

      // Remove invitation
      await remove(invRef);

      // Set current game and start listening
      currentGameIdRef.current = gameId;
      setCurrentGame(game);
      startGameListener(gameId);

    } catch (err) {
      console.error("Error accepting invitation:", err);
      setError("Failed to accept invitation");
    }
  }, [startGameListener]);

  // Decline invitation
  const declineInvitation = useCallback(async (invitationId: string) => {
    if (!database) return;

    try {
      const invRef = ref(database, `invitations/${invitationId}`);
      const invSnapshot = await get(invRef);
      const invitation = invSnapshot.val();

      if (invitation) {
        // Reset player statuses
        await update(ref(database, `players/${invitation.from.id}`), { status: "available" });
        await update(ref(database, `players/${invitation.to.id}`), { status: "available" });
      }

      await remove(invRef);
    } catch (err) {
      console.error("Error declining invitation:", err);
    }
  }, []);

  // Start round
  const startRound = useCallback(async (gameId: string) => {
    if (!playerIdRef.current || !database) return;

    try {
      const gameRef = ref(database, `games/${gameId}`);
      const snapshot = await get(gameRef);

      if (!snapshot.exists()) {
        setError("Game not found");
        return;
      }

      const gameData = snapshot.val();

      // Check if a round is already in progress
      if (gameData.roundStatus === "playing" || gameData.roundStatus === "ready") {
        setError("A round is already in progress");
        return;
      }

      // Increment currentRound and reset moves
      const newRound = (gameData.currentRound || 0) + 1;

      // First show "Ready?" for 2 seconds, then start the countdown
      await update(gameRef, {
        currentRound: newRound,
        moves: {},
        roundStatus: "ready",
        readyTimestamp: serverTimestamp(), // Timestamp for "Ready?" phase
        roundStartTimestamp: null,
        resultCalculated: false,
      });

      // Reset result tracking for new round
      hasProcessedResultRef.current = null;

    } catch (err) {
      console.error("Error starting round:", err);
      setError("Failed to start round");
    }
  }, []);

  // Send move - allows multiple changes during countdown
  const sendMove = useCallback(async (gameId: string, move: string) => {
    if (!playerIdRef.current || !database) return;

    try {
      const gameRef = ref(database, `games/${gameId}`);
      const snapshot = await get(gameRef);

      if (!snapshot.exists()) return;

      const gameData = snapshot.val();
      
      // Only allow moves during playing phase
      if (gameData.roundStatus !== "playing") {
        return;
      }

      const isPlayer1 = gameData.player1.id === playerIdRef.current;
      const moveField = isPlayer1 ? "moves/player1" : "moves/player2";

      // Simply store the move - calculation will be done by checkAndCalculateResult
      await update(gameRef, {
        [moveField]: move,
      });

    } catch (err) {
      console.error("Error sending move:", err);
      setError("Failed to send move");
    }
  }, []);


  // Leave game
  const leaveGame = useCallback(async (gameId: string) => {
    if (!playerIdRef.current || !database) return;

    try {
      // Clear timeouts first
      if (resultTimeoutRef.current) {
        clearTimeout(resultTimeoutRef.current);
        resultTimeoutRef.current = null;
      }
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current);
        readyTimeoutRef.current = null;
      }

      // Stop listening to game
      off(ref(database, `games/${gameId}`));

      // Get game data to notify opponent
      const gameRef = ref(database, `games/${gameId}`);
      const snapshot = await get(gameRef);

      // Update player statuses BEFORE deleting the game
      if (snapshot.exists()) {
        const gameData = snapshot.val();
        const opponentId = gameData.player1?.id === playerIdRef.current
          ? gameData.player2?.id
          : gameData.player1?.id;

        // Update both players' statuses first
        const updates: Record<string, unknown> = {};

        if (opponentId) {
          updates[`players/${opponentId}/status`] = "available";
          updates[`players/${opponentId}/currentGameId`] = null;
        }

        updates[`players/${playerIdRef.current}/status`] = "available";
        updates[`players/${playerIdRef.current}/currentGameId`] = null;

        // Delete the game
        updates[`games/${gameId}`] = null;

        // Apply all updates atomically
        await update(ref(database), updates);
      } else {
        // Game doesn't exist, just update own status
        await update(ref(database, `players/${playerIdRef.current}`), {
          status: "available",
          currentGameId: null,
        });
      }

      // Clear local state
      setCurrentGame(null);
      setRoundStarted(false);
      setRoundResult(null);
      setReadyTimestamp(null);
      currentGameIdRef.current = null;

    } catch (err) {
      console.error("Error leaving game:", err);
      setError("Failed to leave game");
    }
  }, []);

  // Update username
  const updateUsername = useCallback(async (username: string) => {
    if (!playerIdRef.current || !database) return;

    try {
      await update(ref(database, `players/${playerIdRef.current}`), { username });
    } catch (err) {
      console.error("Error updating username:", err);
    }
  }, []);

  // Listen for game invitations that were accepted (for the inviter)
  useEffect(() => {
    if (!playerId || !database) return;

    // Prevent installing listener multiple times
    if (gamesListenerInstalledRef.current) return;
    gamesListenerInstalledRef.current = true;

    const gamesRef = ref(database, "games");
    const unsubscribe = onValue(gamesRef, (snapshot) => {
      if (!snapshot.exists()) return;

      snapshot.forEach((child) => {
        const game = child.val();
        const gameId = child.key!;

        // Check if this player is in this game and not already listening
        if (
          (game.player1?.id === playerIdRef.current || game.player2?.id === playerIdRef.current) &&
          currentGameIdRef.current !== gameId
        ) {
          currentGameIdRef.current = gameId;
          setCurrentGame({
            id: gameId,
            player1: game.player1,
            player2: game.player2,
            scores: game.scores,
            currentRound: game.currentRound,
            moves: game.moves || {},
            roundStarted: game.roundStatus === "playing",
          });
          startGameListener(gameId);
        }
      });
    });

    return () => {
      unsubscribe();
      gamesListenerInstalledRef.current = false;
    };
  }, [playerId, startGameListener]);

  // Auto-connect on mount
  useEffect(() => {
    const displayName = localStorage.getItem("shifumi_displayname") || undefined;
    connect(displayName);

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isConnected,
    isConnecting,
    players,
    currentGame,
    invitations,
    playerId,
    error,
    roundResult,
    roundStarted,
    roundStartTimestamp,
    serverTimeOffset,
    readyTimestamp,
    invitePlayer,
    acceptInvitation,
    declineInvitation,
    sendMove,
    startRound,
    leaveGame,
    connect,
    disconnect,
    updateUsername,
  };
}
