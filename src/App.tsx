/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc, updateDoc, onSnapshot, arrayUnion } from "firebase/firestore";
import { db } from "./firebase";
import { Player, Message, Room, RoomStatus } from "./types";
import { Bot, User, Play, LogIn, Plus, LogOut, Loader2, Sparkles } from "lucide-react";
import Lobby from "./components/Lobby";
import Gameplay from "./components/Gameplay";
import Voting from "./components/Voting";
import Elimination from "./components/Elimination";
import Winner from "./components/Winner";
import Chat from "./components/Chat";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to generate unique short IDs
const generateShortId = (length = 4): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const generatePlayerId = (): string => {
  return "p_" + Math.random().toString(36).substring(2, 11);
};

export default function App() {
  // Local Player info
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem("undercover_player_name") || "";
  });
  const [playerId, setPlayerId] = useState<string>(() => {
    let id = localStorage.getItem("undercover_player_id");
    if (!id) {
      id = generatePlayerId();
      localStorage.setItem("undercover_player_id", id);
    }
    return id;
  });

  // Navigation / Lobbies
  const [targetRoomCode, setTargetRoomCode] = useState("");
  const [activeRoomId, setActiveRoomId] = useState<string | null>(() => {
    return localStorage.getItem("undercover_active_room") || null;
  });

  // Room State
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Bot thinking state (to show a nice visual loader on the host side)
  const [isProcessingBots, setIsProcessingBots] = useState(false);

  // Keep track of the active subscription
  useEffect(() => {
    if (!activeRoomId) {
      setRoom(null);
      return;
    }

    setLoading(true);
    const docRef = doc(db, "rooms", activeRoomId);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        setLoading(false);
        if (docSnap.exists()) {
          const data = docSnap.data() as Room;
          setRoom(data);
          setErrorMsg(null);
        } else {
          // Room deleted or not found
          setRoom(null);
          setActiveRoomId(null);
          localStorage.removeItem("undercover_active_room");
          setErrorMsg("החדר לא נמצא או שנסגר.");
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.GET, `rooms/${activeRoomId}`);
        } catch (wrappedErr) {
          console.error("Wrapped Firestore listen error:", wrappedErr);
        }
        setLoading(false);
        setErrorMsg("שגיאת חיבור לחדר המשחק.");
      }
    );

    return () => unsubscribe();
  }, [activeRoomId]);

  // Persist name
  const saveName = (name: string) => {
    const trimmed = name.trim();
    setPlayerName(trimmed);
    localStorage.setItem("undercover_player_name", trimmed);
  };

  // 1. Create a Room
  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setErrorMsg("אנא הכנס שם לפני יצירת חדר!");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const roomCode = generateShortId();
      const newRoom: Room = {
        id: roomCode,
        hostId: playerId,
        status: "lobby",
        secretWord: "",
        category: "",
        impostorId: "",
        players: [
          {
            id: playerId,
            name: playerName.trim(),
            isHost: true,
            isBot: false,
            isEliminated: false,
            submittedClue: false,
            currentClue: "",
            votedFor: null,
            votesReceived: 0,
          },
        ],
        currentRound: 1,
        messages: [
          {
            id: "system_init",
            senderId: "system",
            senderName: "מערכת",
            text: `ברוכים הבאים לחדר המשחק! הקוד שלכם הוא ${roomCode}. שלחו אותו לחברים!`,
            createdAt: Date.now(),
          },
        ],
        lastActive: Date.now(),
      };

      try {
        await setDoc(doc(db, "rooms", roomCode), newRoom);
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.CREATE, `rooms/${roomCode}`);
      }
      setActiveRoomId(roomCode);
      localStorage.setItem("undercover_active_room", roomCode);
    } catch (err) {
      console.error("Error creating room:", err);
      setErrorMsg("נכשל ביצירת חדר משחק. אנא נסה שוב.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Join a Room
  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setErrorMsg("אנא הכנס שם לפני ההצטרפות!");
      return;
    }
    const code = targetRoomCode.trim().toUpperCase();
    if (!code) {
      setErrorMsg("אנא הכנס קוד חדר תקין!");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      let docSnap;
      try {
        docSnap = await getDoc(doc(db, "rooms", code));
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.GET, `rooms/${code}`);
        return;
      }
      if (!docSnap.exists()) {
        setErrorMsg("קוד חדר לא תקין או שהחדר אינו קיים!");
        setLoading(false);
        return;
      }

      const roomData = docSnap.data() as Room;

      if (roomData.status !== "lobby") {
        setErrorMsg("המשחק כבר התחיל בחדר זה!");
        setLoading(false);
        return;
      }

      if (roomData.players.length >= 10) {
        setErrorMsg("החדר מלא! (מקסימום 10 שחקנים)");
        setLoading(false);
        return;
      }

      // Check if player is already in room (by ID)
      const playerExists = roomData.players.some((p) => p.id === playerId);
      let updatedPlayers = [...roomData.players];

      if (!playerExists) {
        updatedPlayers.push({
          id: playerId,
          name: playerName.trim(),
          isHost: false,
          isBot: false,
          isEliminated: false,
          submittedClue: false,
          currentClue: "",
          votedFor: null,
          votesReceived: 0,
        });

        // Add joining announcement
        const systemMsg: Message = {
          id: `sys_${Date.now()}`,
          senderId: "system",
          senderName: "מערכת",
          text: `השחקן ${playerName.trim()} הצטרף ללובי!`,
          createdAt: Date.now(),
        };

        try {
          await updateDoc(doc(db, "rooms", code), {
            players: updatedPlayers,
            messages: arrayUnion(systemMsg),
            lastActive: Date.now(),
          });
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.UPDATE, `rooms/${code}`);
        }
      }

      setActiveRoomId(code);
      localStorage.setItem("undercover_active_room", code);
    } catch (err) {
      console.error("Error joining room:", err);
      setErrorMsg("נכשל בהצטרפות לחדר. נסו שוב.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Add a Bot
  const handleAddBot = async (name: string, personality: string) => {
    if (!room) return;

    try {
      const botPlayer: Player = {
        id: "bot_" + Math.random().toString(36).substring(2, 11),
        name: name,
        isHost: false,
        isBot: true,
        botPersonality: personality,
        isEliminated: false,
        submittedClue: false,
        currentClue: "",
        votedFor: null,
        votesReceived: 0,
      };

      const systemMsg: Message = {
        id: `sys_bot_${Date.now()}`,
        senderId: "system",
        senderName: "מערכת",
        text: `הבוט החכם ${name} (${personality}) נוסף ללובי על ידי מנהל החדר!`,
        createdAt: Date.now(),
      };

      try {
        await updateDoc(doc(db, "rooms", room.id), {
          players: [...room.players, botPlayer],
          messages: arrayUnion(systemMsg),
          lastActive: Date.now(),
        });
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.UPDATE, `rooms/${room.id}`);
      }
    } catch (err) {
      console.error("Error adding bot:", err);
    }
  };

  // 4. Remove Player / Bot
  const handleRemovePlayer = async (targetId: string) => {
    if (!room) return;

    try {
      const targetPlayer = room.players.find((p) => p.id === targetId);
      const updatedPlayers = room.players.filter((p) => p.id !== targetId);

      const systemMsg: Message = {
        id: `sys_rem_${Date.now()}`,
        senderId: "system",
        senderName: "מערכת",
        text: `המשתתף ${targetPlayer?.name || ""} הוסר מהחדר.`,
        createdAt: Date.now(),
      };

      try {
        await updateDoc(doc(db, "rooms", room.id), {
          players: updatedPlayers,
          messages: arrayUnion(systemMsg),
          lastActive: Date.now(),
        });
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.UPDATE, `rooms/${room.id}`);
      }
    } catch (err) {
      console.error("Error removing player:", err);
    }
  };

  // 5. Start Game (Call API to get word, and assign impostor)
  const handleStartGame = async () => {
    if (!room) return;

    setLoading(true);
    try {
      // Get word and category from our server endpoint
      const response = await fetch("/api/game/generate-word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();

      const secretWord = data.word || "תפוח";
      const category = data.category || "אוכל";

      // Select a random player to be the impostor
      const nonBotCount = room.players.length;
      const impostorIndex = Math.floor(Math.random() * nonBotCount);
      const impostorId = room.players[impostorIndex].id;

      // Reset players status
      const updatedPlayers = room.players.map((p) => ({
        ...p,
        isEliminated: false,
        submittedClue: false,
        currentClue: "",
        votedFor: null,
        votesReceived: 0,
      }));

      const systemMsg: Message = {
        id: `sys_start_${Date.now()}`,
        senderId: "system",
        senderName: "מערכת",
        text: `המשחק התחיל! המילים נשלחו לכולם בצורה חשאית. תתחילו לרשום רמזים!`,
        createdAt: Date.now(),
      };

      try {
        await updateDoc(doc(db, "rooms", room.id), {
          status: "playing",
          secretWord,
          category,
          impostorId,
          players: updatedPlayers,
          currentRound: 1,
          messages: arrayUnion(systemMsg),
          lastActive: Date.now(),
        });
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.UPDATE, `rooms/${room.id}`);
      }
    } catch (err) {
      console.error("Error starting game:", err);
      setErrorMsg("שגיאה בהפעלת המשחק.");
    } finally {
      setLoading(false);
    }
  };

  // 6. Send Message to Chat
  const handleSendMessage = async (text: string) => {
    if (!room) return;

    try {
      const newMsg: Message = {
        id: `msg_${Date.now()}`,
        senderId: playerId,
        senderName: playerName,
        text: text,
        createdAt: Date.now(),
      };

      try {
        await updateDoc(doc(db, "rooms", room.id), {
          messages: arrayUnion(newMsg),
          lastActive: Date.now(),
        });
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.UPDATE, `rooms/${room.id}`);
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // 7. Submit Player Clue
  const handleSelectClue = async (clueText: string) => {
    if (!room) return;

    try {
      const updatedPlayers = room.players.map((p) => {
        if (p.id === playerId) {
          return { ...p, currentClue: clueText, submittedClue: true };
        }
        return p;
      });

      // Check if all active players have now submitted clues
      const activePlayers = updatedPlayers.filter((p) => !p.isEliminated);
      const allSubmitted = activePlayers.every((p) => p.currentClue && p.submittedClue);

      const systemMsg: Message = {
        id: `sys_clue_${Date.now()}`,
        senderId: "system",
        senderName: "מערכת",
        text: `${playerName} הגיש רמז לסיבוב הנוכחי.`,
        createdAt: Date.now(),
      };

      const updateData: any = {
        players: updatedPlayers,
        messages: arrayUnion(systemMsg),
        lastActive: Date.now(),
      };

      if (allSubmitted) {
        updateData.status = "voting";
        updateData.messages.push({
          id: `sys_vote_start_${Date.now()}`,
          senderId: "system",
          senderName: "מערכת",
          text: `כל השחקנים הגישו רמזים! כעת עוברים לשלב ההצבעה הגורלי!`,
          createdAt: Date.now(),
        });
      }

      try {
        await updateDoc(doc(db, "rooms", room.id), updateData);
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.UPDATE, `rooms/${room.id}`);
      }
    } catch (err) {
      console.error("Error submitting clue:", err);
    }
  };

  // 8. Submit Player Vote
  const handleVote = async (targetId: string) => {
    if (!room) return;

    try {
      const updatedPlayers = room.players.map((p) => {
        if (p.id === playerId) {
          return { ...p, votedFor: targetId };
        }
        return p;
      });

      const activePlayers = updatedPlayers.filter((p) => !p.isEliminated);
      const allVoted = activePlayers.every((p) => p.votedFor);

      const systemMsg: Message = {
        id: `sys_vote_${Date.now()}`,
        senderId: "system",
        senderName: "מערכת",
        text: `${playerName} הגיש את הצבעתו.`,
        createdAt: Date.now(),
      };

      const updateData: any = {
        players: updatedPlayers,
        messages: arrayUnion(systemMsg),
        lastActive: Date.now(),
      };

      if (allVoted) {
        // Calculate voting results
        const votesMap: Record<string, number> = {};
        activePlayers.forEach((p) => {
          if (p.votedFor) {
            votesMap[p.votedFor] = (votesMap[p.votedFor] || 0) + 1;
          }
        });

        // Find who has the highest votes
        let maxVotes = -1;
        let eliminatedId = "";
        activePlayers.forEach((p) => {
          const vCount = votesMap[p.id] || 0;
          if (vCount > maxVotes) {
            maxVotes = vCount;
            eliminatedId = p.id;
          }
        });

        // Mark the player as eliminated
        const finalPlayers = updatedPlayers.map((p) => {
          if (p.id === eliminatedId) {
            return { ...p, isEliminated: true };
          }
          return p;
        });

        const eliminatedPlayer = room.players.find((p) => p.id === eliminatedId);
        const isImpostor = eliminatedId === room.impostorId;

        updateData.players = finalPlayers;
        updateData.revealedPlayerName = eliminatedPlayer?.name || "שחקן";
        updateData.revealedPlayerIsImpostor = isImpostor;

        // Determine if game has ended
        const remainingActive = finalPlayers.filter((p) => !p.isEliminated);
        const impostorIsStillActive = remainingActive.some((p) => p.id === room.impostorId);

        if (isImpostor) {
          // Innocent players win
          updateData.status = "winner_players";
          updateData.messages.push({
            id: `sys_win_p_${Date.now()}`,
            senderId: "system",
            senderName: "מערכת",
            text: `המתחזה ${eliminatedPlayer?.name} נחשף והודח! השחקנים התמימים ניצחו במשחק!`,
            createdAt: Date.now(),
          });
        } else if (remainingActive.length <= 2 && impostorIsStillActive) {
          // Impostor wins
          updateData.status = "winner_impostor";
          updateData.messages.push({
            id: `sys_win_imp_${Date.now()}`,
            senderId: "system",
            senderName: "מערכת",
            text: `השחקן התמים ${eliminatedPlayer?.name} הודח. נשארו רק 2 שחקנים כולל המתחזה - המתחזה ניצח במשחק!`,
            createdAt: Date.now(),
          });
        } else {
          // Continue to elimination transition screen
          updateData.status = "elimination";
          updateData.messages.push({
            id: `sys_elim_trans_${Date.now()}`,
            senderId: "system",
            senderName: "מערכת",
            text: `שחקן הודח: ${eliminatedPlayer?.name}. הוא לא היה המתחזה!`,
            createdAt: Date.now(),
          });
        }
      }

      try {
        await updateDoc(doc(db, "rooms", room.id), updateData);
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.UPDATE, `rooms/${room.id}`);
      }
    } catch (err) {
      console.error("Error submitting vote:", err);
    }
  };

  // 9. Host processes bot clues automatically via backend API
  const handleProcessBotsClues = async () => {
    if (!room || isProcessingBots) return;
    setIsProcessingBots(true);

    try {
      const activeBots = room.players.filter((p) => p.isBot && !p.isEliminated);
      const botsWithoutClues = activeBots.filter((p) => !p.submittedClue && !p.currentClue);

      if (botsWithoutClues.length === 0) {
        setIsProcessingBots(false);
        return;
      }

      // Generate clue sequentially for each bot to avoid throttling
      const updatedPlayers = [...room.players];
      const newMessages = [...room.messages];

      for (const bot of botsWithoutClues) {
        // Collect existing clues written so far
        const previousClues = updatedPlayers
          .filter((p) => p.submittedClue || p.currentClue)
          .map((p) => p.currentClue);

        const isImpostor = bot.id === room.impostorId;

        const response = await fetch("/api/game/bot-clue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            secretWord: room.secretWord,
            category: room.category,
            personality: bot.botPersonality || "רגילה",
            isImpostor,
            previousClues,
          }),
        });

        const data = await response.json();
        const botClue = data.clue || "רמז סודי בהחלט";

        // Update bot clue in our local list
        const botIndex = updatedPlayers.findIndex((p) => p.id === bot.id);
        if (botIndex !== -1) {
          updatedPlayers[botIndex] = {
            ...updatedPlayers[botIndex],
            currentClue: botClue,
            submittedClue: true,
          };
        }

        newMessages.push({
          id: `bot_msg_${bot.id}_${Date.now()}`,
          senderId: "system",
          senderName: "מערכת",
          text: `הבוט ${bot.name} הגיש רמז לסיבוב זה!`,
          createdAt: Date.now(),
        });
      }

      // Check if all active players (humans + bots) have submitted clues
      const activePlayers = updatedPlayers.filter((p) => !p.isEliminated);
      const allSubmitted = activePlayers.every((p) => p.currentClue && p.submittedClue);

      const updateData: any = {
        players: updatedPlayers,
        messages: newMessages,
        lastActive: Date.now(),
      };

      if (allSubmitted) {
        updateData.status = "voting";
        updateData.messages.push({
          id: `sys_vote_start_bot_${Date.now()}`,
          senderId: "system",
          senderName: "מערכת",
          text: `כל המשתתפים (כולל הבוטים) הגישו רמזים! כעת עוברים לשלב ההצבעה הגורלי!`,
          createdAt: Date.now(),
        });
      }

      try {
        await updateDoc(doc(db, "rooms", room.id), updateData);
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.UPDATE, `rooms/${room.id}`);
      }
    } catch (err) {
      console.error("Error processing bot clues:", err);
    } finally {
      setIsProcessingBots(false);
    }
  };

  // 10. Host processes bot votes automatically via backend API
  const handleProcessBotsVotes = async () => {
    if (!room || isProcessingBots) return;
    setIsProcessingBots(true);

    try {
      const activeBots = room.players.filter((p) => p.isBot && !p.isEliminated);
      const botsWithoutVotes = activeBots.filter((p) => !p.votedFor);

      if (botsWithoutVotes.length === 0) {
        setIsProcessingBots(false);
        return;
      }

      const updatedPlayers = [...room.players];
      const newMessages = [...room.messages];

      for (const bot of botsWithoutVotes) {
        const isImpostor = bot.id === room.impostorId;

        const response = await fetch("/api/game/bot-vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            botId: bot.id,
            players: updatedPlayers,
            isImpostor,
            secretWord: room.secretWord,
            category: room.category,
          }),
        });

        const data = await response.json();
        const votedFor = data.votedFor;
        const reason = data.reason || "הוא נראה לי חשוד מאוד!";

        // Update bot vote
        const botIndex = updatedPlayers.findIndex((p) => p.id === bot.id);
        if (botIndex !== -1 && votedFor) {
          updatedPlayers[botIndex] = {
            ...updatedPlayers[botIndex],
            votedFor,
          };
        }

        // Add a funny bot comment in chat explaining their vote!
        const votedPlayerName = updatedPlayers.find((p) => p.id === votedFor)?.name || "מישהו";
        newMessages.push({
          id: `bot_chat_${bot.id}_${Date.now()}`,
          senderId: bot.id,
          senderName: bot.name,
          text: `אני מצביע ל-${votedPlayerName}! סיבה: ${reason}`,
          createdAt: Date.now(),
        });
      }

      // Check if all active players have voted
      const activePlayers = updatedPlayers.filter((p) => !p.isEliminated);
      const allVoted = activePlayers.every((p) => p.votedFor);

      const updateData: any = {
        players: updatedPlayers,
        messages: newMessages,
        lastActive: Date.now(),
      };

      if (allVoted) {
        // Calculate voting results
        const votesMap: Record<string, number> = {};
        activePlayers.forEach((p) => {
          if (p.votedFor) {
            votesMap[p.votedFor] = (votesMap[p.votedFor] || 0) + 1;
          }
        });

        // Find who has highest votes
        let maxVotes = -1;
        let eliminatedId = "";
        activePlayers.forEach((p) => {
          const vCount = votesMap[p.id] || 0;
          if (vCount > maxVotes) {
            maxVotes = vCount;
            eliminatedId = p.id;
          }
        });

        // Mark player as eliminated
        const finalPlayers = updatedPlayers.map((p) => {
          if (p.id === eliminatedId) {
            return { ...p, isEliminated: true };
          }
          return p;
        });

        const eliminatedPlayer = room.players.find((p) => p.id === eliminatedId);
        const isImpostor = eliminatedId === room.impostorId;

        updateData.players = finalPlayers;
        updateData.revealedPlayerName = eliminatedPlayer?.name || "שחקן";
        updateData.revealedPlayerIsImpostor = isImpostor;

        // Check if game has ended
        const remainingActive = finalPlayers.filter((p) => !p.isEliminated);
        const impostorIsStillActive = remainingActive.some((p) => p.id === room.impostorId);

        if (isImpostor) {
          // Innocent players win
          updateData.status = "winner_players";
          updateData.messages.push({
            id: `sys_win_p_${Date.now()}`,
            senderId: "system",
            senderName: "מערכת",
            text: `המתחזה ${eliminatedPlayer?.name} נחשף והודח! השחקנים התמימים ניצחו במשחק!`,
            createdAt: Date.now(),
          });
        } else if (remainingActive.length <= 2 && impostorIsStillActive) {
          // Impostor wins
          updateData.status = "winner_impostor";
          updateData.messages.push({
            id: `sys_win_imp_${Date.now()}`,
            senderId: "system",
            senderName: "מערכת",
            text: `השחקן התמים ${eliminatedPlayer?.name} הודח. נשארו רק 2 שחקנים כולל המתחזה - המתחזה ניצח במשחק!`,
            createdAt: Date.now(),
          });
        } else {
          // Continue to elimination transition screen
          updateData.status = "elimination";
          updateData.messages.push({
            id: `sys_elim_trans_${Date.now()}`,
            senderId: "system",
            senderName: "מערכת",
            text: `שחקן הודח: ${eliminatedPlayer?.name}. הוא לא היה המתחזה!`,
            createdAt: Date.now(),
          });
        }
      }

      try {
        await updateDoc(doc(db, "rooms", room.id), updateData);
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.UPDATE, `rooms/${room.id}`);
      }
    } catch (err) {
      console.error("Error processing bot votes:", err);
    } finally {
      setIsProcessingBots(false);
    }
  };

  // 11. Next Round transition
  const handleNextRound = async () => {
    if (!room) return;

    try {
      const resetPlayers = room.players.map((p) => ({
        ...p,
        currentClue: "",
        votedFor: null,
        submittedClue: false,
      }));

      const systemMsg: Message = {
        id: `sys_next_rnd_${Date.now()}`,
        senderId: "system",
        senderName: "מערכת",
        text: `מתחילים סיבוב חדש! רשמו רמזים חדשים שמתאימים למילה שלכם.`,
        createdAt: Date.now(),
      };

      try {
        await updateDoc(doc(db, "rooms", room.id), {
          status: "playing",
          currentRound: room.currentRound + 1,
          players: resetPlayers,
          messages: arrayUnion(systemMsg),
          lastActive: Date.now(),
        });
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.UPDATE, `rooms/${room.id}`);
      }
    } catch (err) {
      console.error("Error advancing to next round:", err);
    }
  };

  // 12. Reset Game Room to lobby to Play Again
  const handlePlayAgain = async () => {
    if (!room) return;

    try {
      const resetPlayers = room.players.map((p) => ({
        ...p,
        isEliminated: false,
        submittedClue: false,
        currentClue: "",
        votedFor: null,
        votesReceived: 0,
      }));

      const systemMsg: Message = {
        id: `sys_play_again_${Date.now()}`,
        senderId: "system",
        senderName: "מערכת",
        text: `מנהל החדר אתחל את המשחק! ממתינים בלובי לתחילת סבב חדש.`,
        createdAt: Date.now(),
      };

      try {
        await updateDoc(doc(db, "rooms", room.id), {
          status: "lobby",
          secretWord: "",
          category: "",
          impostorId: "",
          players: resetPlayers,
          currentRound: 1,
          messages: arrayUnion(systemMsg),
          lastActive: Date.now(),
        });
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.UPDATE, `rooms/${room.id}`);
      }
    } catch (err) {
      console.error("Error resetting game:", err);
    }
  };

  // 13. Exit game room back to landing screen
  const handleExitRoom = async () => {
    if (room) {
      // Remove self from room if it's in lobby state, or just leave it
      try {
        const updatedPlayers = room.players.filter((p) => p.id !== playerId);
        if (updatedPlayers.length === 0) {
          // Room is empty, we could delete it, but simple update is fine
        } else {
          const updateData: any = { players: updatedPlayers };
          if (room.hostId === playerId && updatedPlayers.length > 0) {
            // Reassign host
            updateData.hostId = updatedPlayers[0].id;
            updatedPlayers[0].isHost = true;
          }
          try {
            await updateDoc(doc(db, "rooms", room.id), updateData);
          } catch (dbErr) {
            handleFirestoreError(dbErr, OperationType.UPDATE, `rooms/${room.id}`);
          }
        }
      } catch (err) {
        console.error("Error leaving room:", err);
      }
    }

    setRoom(null);
    setActiveRoomId(null);
    localStorage.removeItem("undercover_active_room");
  };

  // Render sub-sections dynamically based on Room Status
  const renderGameContent = () => {
    if (!room) return null;

    switch (room.status) {
      case "lobby":
        return (
          <Lobby
            room={room}
            currentPlayerId={playerId}
            onAddBot={handleAddBot}
            onRemovePlayer={handleRemovePlayer}
            onStartGame={handleStartGame}
          />
        );
      case "playing":
        return (
          <Gameplay
            room={room}
            currentPlayerId={playerId}
            onSelectClue={handleSelectClue}
            onProcessBotsClues={handleProcessBotsClues}
          />
        );
      case "voting":
        return (
          <Voting
            room={room}
            currentPlayerId={playerId}
            onVote={handleVote}
            onProcessBotsVotes={handleProcessBotsVotes}
          />
        );
      case "elimination":
        return (
          <Elimination
            room={room}
            currentPlayerId={playerId}
            onNextRound={handleNextRound}
            onEndGame={() => {}} // Not needed since the automatic check determines it
          />
        );
      case "winner_players":
      case "winner_impostor":
        return (
          <Winner
            room={room}
            currentPlayerId={playerId}
            onPlayAgain={handlePlayAgain}
            onExit={handleExitRoom}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col justify-between selection:bg-blue-600/30">
      {/* Top Navigation HUD */}
      <header className="bg-gradient-to-r from-blue-950/20 to-purple-950/20 backdrop-blur-md border-b border-white/10 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 shadow-2xl" dir="rtl">
        {room ? (
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-blue-400 font-bold">קוד חדר</span>
              <span className="text-2xl font-mono tracking-tighter text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">{room.id}</span>
            </div>
            <div className="h-10 w-[1px] bg-white/10"></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-purple-400 font-bold">סיבוב</span>
              <span className="text-xl font-bold">{room.currentRound}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-xl font-bold shadow-md shadow-blue-500/20">
              🎭
            </div>
            <div className="flex flex-col items-start">
              <span className="font-black text-sm text-slate-300 tracking-tight">מי המתחזה?</span>
              <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider">משחק קבוצתי אינטראקטיבי</span>
            </div>
          </div>
        )}

        <div className="text-center">
          <h1 className="text-3xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 uppercase">
            מי המתחזה?
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {room ? (
            <div className="flex items-center gap-3">
              <button
                onClick={handleExitRoom}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 font-medium px-3.5 py-2 rounded-xl bg-white/5 hover:bg-red-950/20 border border-white/10 hover:border-red-900/30 transition-all cursor-pointer"
              >
                <LogOut size={13} />
                <span>צא מהחדר</span>
              </button>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full border-2 border-blue-500 p-0.5 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.5)] flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                {playerName ? playerName[0] : "מ"}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="flex-1 flex flex-col justify-center py-6">
        {loading && !room ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-blue-500" size={36} />
            <p className="text-sm text-slate-400 font-medium">מתחבר לשרת המשחק...</p>
          </div>
        ) : !room ? (
          /* LANDING SCREEN / JOIN & CREATE ROOM */
          <div className="max-w-md w-full mx-auto px-4 py-8" dir="rtl">
            <div className="text-center mb-8">
              <span className="inline-flex items-center gap-1.5 text-xs bg-white/5 border border-white/10 text-blue-400 px-3.5 py-1.5 rounded-full font-bold mb-4 shadow-sm">
                <Sparkles size={12} className="animate-pulse" /> משחק חברתי מבוסס בינה מלאכותית
              </span>
              <h1 className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]">
                מי המתחזה?
              </h1>
              <p className="text-slate-400 mt-2.5 text-sm leading-relaxed max-w-sm mx-auto">
                התחברו יחד, קבלו מילה סודית, מצאו את המתחזה שאינו יודע את המילה או נסו להישאר סמויים בעצמכם!
              </p>
            </div>

            {errorMsg && (
              <div className="bg-red-950/20 border border-red-900/30 text-red-400 text-xs px-4 py-3 rounded-xl mb-6 text-center font-medium">
                {errorMsg}
              </div>
            )}

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 relative overflow-hidden backdrop-blur-sm">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
              
              {/* Name Input Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/50 uppercase tracking-wide block">כינוי במשחק</label>
                <div className="relative">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => saveName(e.target.value)}
                    placeholder="הקלידו את שמכם (למשל: דניאל)"
                    maxLength={15}
                    className="w-full bg-black/40 border border-white/10 text-white rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all placeholder-white/20 font-semibold text-right"
                  />
                  <div className="absolute left-3 top-3.5 text-white/30">
                    <User size={16} />
                  </div>
                </div>
              </div>

              {/* Separator line */}
              <div className="border-t border-white/5 my-2"></div>

              {/* Action grid */}
              <div className="flex flex-col gap-3">
                {/* Create Room Button */}
                <button
                  onClick={handleCreateRoom}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95 cursor-pointer text-sm"
                >
                  <Plus size={16} />
                  <span>צור חדר משחק חדש</span>
                </button>

                {/* OR divider */}
                <div className="flex items-center my-1 text-xs text-white/30 font-bold uppercase gap-2.5">
                  <div className="flex-1 border-t border-white/5"></div>
                  <span>או הצטרפו לחדר קיים</span>
                  <div className="flex-1 border-t border-white/5"></div>
                </div>

                {/* Join code input and Join Button */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={targetRoomCode}
                    onChange={(e) => setTargetRoomCode(e.target.value)}
                    placeholder="קוד חדר"
                    maxLength={4}
                    className="flex-1 bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all placeholder-white/20 text-center font-mono font-bold tracking-widest uppercase"
                  />
                  <button
                    onClick={handleJoinRoom}
                    className="bg-white/5 hover:bg-white/10 text-white font-bold px-5 py-3 rounded-xl transition-all border border-white/10 cursor-pointer text-sm flex items-center gap-1.5"
                  >
                    <LogIn size={15} />
                    <span>הצטרף</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* CURRENT PLAYING ROOM INTERFACE */
          <div className="max-w-7xl mx-auto w-full px-4 flex flex-col lg:flex-row gap-6">
            {/* Left side: The Active Game Screen (Main game actions) */}
            <div className="flex-1">
              {renderGameContent()}
            </div>

            {/* Right side: Chat Panel (Highly visual real-time chat) */}
            <div className="w-full lg:w-96 flex flex-col justify-start">
              <Chat
                messages={room.messages}
                players={room.players}
                currentPlayerId={playerId}
                onSendMessage={handleSendMessage}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/5 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between text-[10px] text-white/20 uppercase tracking-widest shrink-0 border-t border-white/10">
        <div className="flex gap-4">
          <span>v1.2.5-stable</span>
          <span>latency: 24ms</span>
        </div>
        <p className="my-1 sm:my-0">© 2026 מי המתחזה - נבנה באמצעות Google AI Studio.</p>
        <div className="flex gap-4">
          <span className="text-blue-500/40">מצב משחק: קבוצה נגד יחיד</span>
          <span className="text-white/40">שרת אירופה #4</span>
        </div>
      </footer>
    </div>
  );
}
