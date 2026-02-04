"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { WebSocketMessage, Player, Game, Invitation } from "@/types/GameState";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
const SESSION_ID_KEY = "shifumi_session_id";

// Detect if running on Vercel preview deployment
// Preview URLs look like: project-git-branch-team.vercel.app or project-hash-team.vercel.app
function isVercelPreview(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  // Check if it's a vercel.app domain but not the main production domain
  // Production is typically just "project.vercel.app" or custom domain
  const isVercelDomain = hostname.endsWith(".vercel.app");
  const isPreviewPattern = isVercelDomain && (
    hostname.includes("-git-") || // git branch preview: project-git-branch-team.vercel.app
    /^[a-z0-9]+-[a-z0-9]{9}-/.test(hostname) // commit preview: project-hash123456-team.vercel.app
  );
  return isPreviewPattern;
}

// Get or create a persistent session ID
function getSessionId(): string {
  if (typeof window === "undefined") return uuidv4();

  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  players: Player[];
  currentGame: Game | null;
  invitations: Invitation[];
  playerId: string | null;
  error: string | null;
  roundResult: { result: string; yourResult: string; scores: { player1: number; player2: number } } | null;
  roundStarting: boolean;
  roundStarted: boolean;
  roundStartTimestamp: number | null;
  preCountdownTimestamp: number | null;
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

export function useWebSocket(): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roundResult, setRoundResult] = useState<{ result: string; yourResult: string; scores: { player1: number; player2: number } } | null>(null);
  const [roundStarting, setRoundStarting] = useState(false);
  const [roundStarted, setRoundStarted] = useState(false);
  const [roundStartTimestamp, setRoundStartTimestamp] = useState<number | null>(null);
  const [preCountdownTimestamp, setPreCountdownTimestamp] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string>("");
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const connectionTimeout = 45000; // 45s timeout for cold start

  const connect = useCallback(
    (username?: string) => {
      // Don't connect on Vercel preview deployments to avoid ghost players
      if (isVercelPreview()) {
        console.log("Skipping WebSocket connection on Vercel preview");
        setError("Preview mode - WebSocket disabled");
        return;
      }

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      setIsConnecting(true);
      setError(null);

      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        // Set connection timeout (for cold starts)
        connectionTimeoutRef.current = setTimeout(() => {
          if (!isConnected && wsRef.current?.readyState !== WebSocket.OPEN) {
            console.log("Connection timeout - server may be starting");
            setError("Server is waking up... Please wait or refresh.");
            setIsConnecting(false);
            ws.close();
          }
        }, connectionTimeout);

        ws.onopen = () => {
          console.log("WebSocket connected");
          // Clear connection timeout
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }
          setIsConnected(true);
          setIsConnecting(false);
          setError(null);
          reconnectAttemptsRef.current = 0;

          // Send connection message
          ws.send(
            JSON.stringify({
              type: "connect",
              payload: {
                sessionId: sessionIdRef.current,
                username,
              },
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            handleMessage(message);
          } catch (err) {
            console.error("Error parsing message:", err);
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          setError("Connection error - retrying...");
        };

        ws.onclose = () => {
          console.log("WebSocket disconnected");
          // Clear connection timeout
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }
          setIsConnected(false);
          setIsConnecting(false);
          wsRef.current = null;

          // Attempt to reconnect
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current += 1;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
            reconnectTimeoutRef.current = setTimeout(() => {
              connect(username);
            }, delay);
          } else {
            setError("Failed to reconnect. Please refresh the page.");
          }
        };
      } catch (err) {
        console.error("Error creating WebSocket:", err);
        setIsConnecting(false);
        setError("Failed to connect to server");
      }
    },
    []
  );

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setPlayers([]);
    setCurrentGame(null);
    setInvitations([]);
    setPlayerId(null);
  }, []);

  const handleMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case "connection:success":
        setPlayerId(message.payload.playerId);
        break;

      case "players:list":
        setPlayers(message.payload.players || []);
        break;

      case "game:invitation:received":
        setInvitations((prev) => [...prev, message.payload.invitation]);
        break;

      case "game:started":
        setCurrentGame(message.payload.game);
        setRoundResult(null);
        setRoundStarting(false);
        setRoundStarted(false);
        setInvitations((prev) =>
          prev.filter((inv) => inv.id !== message.payload.invitationId)
        );
        break;

      // Removed game:move:received - moves are only revealed with the result

      case "game:round:starting":
        // Start the pre-countdown (synchronisé avec le serveur)
        console.log("Round starting received", message.payload);
        setRoundStarting(true);
        setRoundStarted(false);
        setRoundResult(null); // Clear previous result
        // Stocker le timestamp serveur pour synchronisation
        setPreCountdownTimestamp(message.payload.timestamp || Date.now());
        setRoundStartTimestamp(null);
        break;

      case "game:round:started":
        // Start the SHI FU MI countdown (synchronisé avec le serveur)
        console.log("Round started received", message.payload);
        setRoundStarting(false);
        setRoundStarted(true);
        // Stocker le timestamp serveur pour synchronisation
        setRoundStartTimestamp(message.payload.timestamp || Date.now());
        setPreCountdownTimestamp(null);
        break;

      case "game:round:result":
        // Update game state with round result, scores, and revealed moves
        console.log("Round result received:", message.payload);
        const roundResultData = {
          result: message.payload.result,
          yourResult: message.payload.yourResult,
          scores: message.payload.scores,
        };
        setRoundResult(roundResultData);
        setRoundStarting(false);
        setRoundStarted(false);
        // Reset timestamps
        setRoundStartTimestamp(null);
        setPreCountdownTimestamp(null);
        setCurrentGame((prev) => {
          if (!prev || prev.id !== message.payload.gameId) return prev;
          const updatedGame = {
            ...prev,
            scores: message.payload.scores,
            moves: message.payload.moves || prev.moves, // Use moves from server (revealed)
            roundStarted: false,
          };
          console.log("Updated game state:", updatedGame);
          return updatedGame;
        });
        break;

      case "game:opponent:disconnected":
        setCurrentGame(null);
        setRoundStarting(false);
        setRoundStarted(false);
        setRoundStartTimestamp(null);
        setPreCountdownTimestamp(null);
        setError("Your opponent disconnected. Game ended.");
        break;

      case "game:opponent:left":
        setCurrentGame(null);
        setRoundStarting(false);
        setRoundStarted(false);
        setRoundStartTimestamp(null);
        setPreCountdownTimestamp(null);
        setError("Your opponent left the game.");
        break;

      case "game:left":
        setCurrentGame(null);
        setRoundResult(null);
        setRoundStarting(false);
        setRoundStarted(false);
        setRoundStartTimestamp(null);
        setPreCountdownTimestamp(null);
        break;

      case "error":
        setError(message.payload.message);
        break;

      default:
        console.log("Unknown message type:", message.type);
    }
  };

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("Sending WebSocket message:", message);
      wsRef.current.send(JSON.stringify(message));
    } else {
      const errorMsg = `Not connected to server. ReadyState: ${wsRef.current?.readyState}`;
      console.error(errorMsg);
      setError(errorMsg);
    }
  }, []);

  const invitePlayer = useCallback(
    (targetPlayerId: string) => {
      sendMessage({
        type: "game:invite",
        payload: { targetPlayerId },
      });
    },
    [sendMessage]
  );

  const acceptInvitation = useCallback(
    (invitationId: string) => {
      sendMessage({
        type: "game:invitation:accept",
        payload: { invitationId },
      });
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    },
    [sendMessage]
  );

  const declineInvitation = useCallback(
    (invitationId: string) => {
      sendMessage({
        type: "game:invitation:decline",
        payload: { invitationId },
      });
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    },
    [sendMessage]
  );

  const sendMove = useCallback(
    (gameId: string, move: string) => {
      sendMessage({
        type: "game:move",
        payload: { gameId, move },
      });
    },
    [sendMessage]
  );

  const startRound = useCallback(
    (gameId: string) => {
      console.log("Sending start round message", gameId);
      sendMessage({
        type: "game:start:round",
        payload: { gameId },
      });
    },
    [sendMessage]
  );

  const leaveGame = useCallback(
    (gameId: string) => {
      console.log("Leaving game", gameId);
      sendMessage({
        type: "game:leave",
        payload: { gameId },
      });
    },
    [sendMessage]
  );

  const updateUsername = useCallback(
    (username: string) => {
      sendMessage({
        type: "player:update:username",
        payload: { username },
      });
    },
    [sendMessage]
  );

  // Auto-connect on mount with saved username
  useEffect(() => {
    // Initialize sessionId from localStorage (persistent across tabs/reloads)
    sessionIdRef.current = getSessionId();

    const displayName = localStorage.getItem("shifumi_displayname") || undefined;
    connect(displayName);
    return () => {
      disconnect();
    };
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
    roundStarting,
    roundStarted,
    roundStartTimestamp,
    preCountdownTimestamp,
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

