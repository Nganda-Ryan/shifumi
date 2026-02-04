import { Move } from "./Move";

export type PlayerStatus = "available" | "in-game" | "invited";

export interface Player {
  id: string;
  username?: string;
  sessionId: string;
  status: PlayerStatus;
}

export interface Game {
  id: string;
  player1: Player;
  player2: Player;
  scores: {
    player1: number;
    player2: number;
  };
  currentRound: number;
  moves: {
    player1?: Move;
    player2?: Move;
  };
  roundStarted: boolean;
}

export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";

export interface Invitation {
  id: string;
  from: Player;
  to: Player;
  status: InvitationStatus;
  createdAt: number;
}

export interface WebSocketMessage {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any;
}

export interface RoundStartingMessage extends WebSocketMessage {
  type: "game:round:starting";
  payload: {
    gameId: string;
  };
}

export interface RoundStartedMessage extends WebSocketMessage {
  type: "game:round:started";
  payload: {
    gameId: string;
  };
}

