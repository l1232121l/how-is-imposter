export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isBot: boolean;
  botPersonality?: string;
  isEliminated: boolean;
  submittedClue: boolean;
  currentClue: string;
  votedFor: string | null;
  votesReceived: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: number;
}

export type RoomStatus =
  | "lobby"
  | "playing"
  | "voting"
  | "elimination"
  | "winner_players"
  | "winner_impostor";

export interface Room {
  id: string; // 4-letter uppercase room code
  hostId: string;
  status: RoomStatus;
  secretWord: string;
  category: string;
  impostorId: string;
  players: Player[];
  currentRound: number;
  messages: Message[];
  lastActive: number;
  winnerName?: string; // If ended
  revealedPlayerName?: string; // Who was voted out
  revealedPlayerIsImpostor?: boolean; // If they were the impostor
}
