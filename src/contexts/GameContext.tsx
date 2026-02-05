"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useFirebaseGame } from "@/hooks/useFirebaseGame";
import { Player, Game, Invitation } from "@/types/GameState";

interface GameContextType {
  isConnected: boolean;
  isConnecting: boolean;
  players: Player[];
  currentGame: Game | null;
  invitations: Invitation[];
  playerId: string | null;
  error: string | null;
  roundResult: { result: string; yourResult: string; scores: { player1: number; player2: number } } | null;
  roundStarted: boolean;
  roundStartTimestamp: number | null;
  serverTimeOffset: number;
  isReady: boolean;
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
  const firebaseGame = useFirebaseGame();

  return <GameContext.Provider value={firebaseGame}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}

