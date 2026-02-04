// Types définis localement pour le serveur (autonome pour le déploiement)
export type Move = null | "stone" | "paper" | "scissors";
export type Result = null | "Draw" | "Win" | "Loose";

export type PlayerStatus = "available" | "in-game" | "invited";

export interface Player {
  id: string;
  username?: string;
  sessionId: string;
  status: PlayerStatus;
  socketId?: string;
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

// Client to Server messages
export interface ClientMessage {
  type: string;
  payload?: any;
}

export interface ConnectMessage extends ClientMessage {
  type: "connect";
  payload: {
    username?: string;
    sessionId: string;
  };
}

export interface InviteMessage extends ClientMessage {
  type: "game:invite";
  payload: {
    targetPlayerId: string;
  };
}

export interface AcceptInvitationMessage extends ClientMessage {
  type: "game:invitation:accept";
  payload: {
    invitationId: string;
  };
}

export interface DeclineInvitationMessage extends ClientMessage {
  type: "game:invitation:decline";
  payload: {
    invitationId: string;
  };
}

export interface MoveMessage extends ClientMessage {
  type: "game:move";
  payload: {
    gameId: string;
    move: Move;
  };
}

export interface StartRoundMessage extends ClientMessage {
  type: "game:start:round";
  payload: {
    gameId: string;
  };
}

export interface LeaveGameMessage extends ClientMessage {
  type: "game:leave";
  payload: {
    gameId: string;
  };
}

export interface UpdateUsernameMessage extends ClientMessage {
  type: "player:update:username";
  payload: {
    username: string;
  };
}

// Server to Client messages
export interface ServerMessage {
  type: string;
  payload?: any;
}

export interface ConnectionSuccessMessage extends ServerMessage {
  type: "connection:success";
  payload: {
    playerId: string;
  };
}

export interface PlayersListMessage extends ServerMessage {
  type: "players:list";
  payload: {
    players: Player[];
  };
}

export interface InvitationReceivedMessage extends ServerMessage {
  type: "game:invitation:received";
  payload: {
    invitation: Invitation;
  };
}

export interface GameStartedMessage extends ServerMessage {
  type: "game:started";
  payload: {
    gameId: string;
    game: Game;
    opponent: Player;
  };
}

export interface MoveReceivedMessage extends ServerMessage {
  type: "game:move:received";
  payload: {
    gameId: string;
    opponentMove?: Move;
  };
}

export interface RoundResultMessage extends ServerMessage {
  type: "game:round:result";
  payload: {
    gameId: string;
    result: Result;
    yourResult: Result;
    scores: {
      player1: number;
      player2: number;
    };
  };
}

export interface RoundStartingMessage extends ServerMessage {
  type: "game:round:starting";
  payload: {
    gameId: string;
    timestamp: number;           // Timestamp serveur pour synchronisation
    preCountdownDuration: number; // Durée du pré-countdown en ms
    shiFuMiDuration: number;      // Durée du countdown SHI FU MI en ms
  };
}

export interface RoundStartedMessage extends ServerMessage {
  type: "game:round:started";
  payload: {
    gameId: string;
    timestamp: number;  // Timestamp serveur pour synchronisation
  };
}

export interface ErrorMessage extends ServerMessage {
  type: "error";
  payload: {
    message: string;
    code?: string;
  };
}

