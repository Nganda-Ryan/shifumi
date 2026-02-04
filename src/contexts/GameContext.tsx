"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Player, Game, Invitation } from "@/types/GameState";

interface GameContextType {
  isConnected: boolean;
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

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const websocket = useWebSocket();

  return <GameContext.Provider value={websocket}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}

