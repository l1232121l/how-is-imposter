import React, { useEffect, useState } from "react";
import { AlertTriangle, Bot, User, Vote, CheckCircle2 } from "lucide-react";
import { Room, Player } from "../types";

interface VotingProps {
  room: Room;
  currentPlayerId: string;
  onVote: (targetId: string) => void;
  onProcessBotsVotes: () => void;
}

export default function Voting({ room, currentPlayerId, onVote, onProcessBotsVotes }: VotingProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  const me = room.players.find((p) => p.id === currentPlayerId);
  const isHost = room.hostId === currentPlayerId;
  const isEliminated = me?.isEliminated;

  const activePlayers = room.players.filter((p) => !p.isEliminated);
  const voters = activePlayers.filter((p) => p.votedFor);
  const totalVotesCount = voters.length;

  // Host processes bot votes in the background
  useEffect(() => {
    if (isHost && room.status === "voting") {
      const activeBots = room.players.filter((p) => p.isBot && !p.isEliminated);
      const botsWithoutVotes = activeBots.filter((p) => !p.votedFor);
      if (botsWithoutVotes.length > 0) {
        onProcessBotsVotes();
      }
    }
  }, [isHost, room.status, room.players, onProcessBotsVotes]);

  const handleVoteSubmit = () => {
    if (!selectedTarget || isEliminated || me?.votedFor) return;
    onVote(selectedTarget);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4" dir="rtl">
      {/* Top Title Bar */}
      <div className="bg-black/40 border border-white/10 rounded-3xl p-4 shadow-2xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden backdrop-blur-sm">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
        <div>
          <span className="text-xs font-bold text-red-400 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full uppercase tracking-widest font-mono">
            שלב ההצבעות - סיבוב {room.currentRound}
          </span>
          <h2 className="text-lg font-bold text-white mt-2.5">מי המתחזה? קראו את הרמזים והצביעו!</h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">קולות שהתקבלו:</span>
          <span className="text-xs font-bold bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3.5 py-1.5 rounded-full font-mono">
            {totalVotesCount} מתוך {activePlayers.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Clues & Voting Targets */}
        <div className="md:col-span-8 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-300 px-1">בחרו את השחקן החשוד ביותר בעיניכם:</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activePlayers.map((player) => {
              const isMe = player.id === currentPlayerId;
              const hasVoted = me?.votedFor;
              const isSelected = selectedTarget === player.id;

              return (
                <div
                  key={player.id}
                  onClick={() => {
                    if (isMe || isEliminated || hasVoted) return;
                    setSelectedTarget(player.id);
                  }}
                  className={`border rounded-2xl p-4 transition-all duration-200 shadow-lg flex flex-col justify-between h-36 ${
                    isMe
                      ? "bg-white/5 border-white/5 cursor-not-allowed opacity-40"
                      : isEliminated || hasVoted
                      ? "bg-black/20 border-white/5 opacity-80"
                      : isSelected
                      ? "bg-blue-950/50 border-blue-500 ring-2 ring-blue-500/30 cursor-pointer"
                      : "bg-white/5 border-white/10 hover:border-blue-500/30 cursor-pointer"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${player.isBot ? "bg-red-950/50 text-red-300 border border-red-500/20" : "bg-gray-700 text-white"}`}>
                        {player.isBot ? "BOT" : player.name[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-xs">{player.name}</span>
                        {isMe && <span className="text-[9px] text-blue-400 font-semibold font-mono uppercase tracking-wide">אני</span>}
                      </div>
                    </div>

                    {/* Checkbox selector */}
                    {!isMe && !isEliminated && !hasVoted && (
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? "border-blue-500 bg-blue-600" : "border-white/10 bg-black/40"}`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                    )}
                  </div>

                  {/* Clue text */}
                  <div className="mt-4 bg-black/40 border border-white/5 p-2.5 rounded-xl flex flex-col justify-center min-h-[50px]">
                    <span className="text-[10px] text-white/30 block mb-0.5">הרמז שהוגש:</span>
                    <span className="text-sm font-black text-blue-300 leading-tight">
                      "{player.currentClue || "לא הוגש רמז"}"
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Action bar */}
          {!isEliminated && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 shadow-2xl mt-2 relative overflow-hidden backdrop-blur-sm">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
              {me?.votedFor ? (
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-center gap-3 text-blue-400">
                  <CheckCircle2 size={24} />
                  <div>
                    <p className="text-sm font-bold">הצבעתך נקלטה במערכת!</p>
                    <p className="text-xs text-blue-300 mt-0.5">
                      הצבעת ל-<b>{room.players.find((p) => p.id === me?.votedFor)?.name}</b>. כעת נמתין לשאר השחקנים והבוטים.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Vote className="text-red-400 animate-pulse" size={24} />
                    <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                      {selectedTarget ? (
                        <>
                          בחרת להצביע ל-<b>{room.players.find((p) => p.id === selectedTarget)?.name}</b>. לאחר הגשת ההצבעה לא יהיה ניתן לשנות את הבחירה!
                        </>
                      ) : (
                        "אנא בחרו את אחד המשתתפים שלדעתכם הוא המתחזה כדי להגיש את הצבעתכם."
                      )}
                    </p>
                  </div>

                  <button
                    onClick={handleVoteSubmit}
                    disabled={!selectedTarget}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-[0_0_20px_rgba(37,99,235,0.4)] cursor-pointer"
                  >
                    הגש הצבעה
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Voter statuses panel */}
        <div className="md:col-span-4 bg-white/5 border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
          <h3 className="text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-2 border-b border-white/10 pb-2">מצב ההצבעות</h3>
          
          <div className="space-y-2.5">
            {activePlayers.map((player) => {
              const hasVoted = !!player.votedFor;
              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                    hasVoted
                      ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                      : "bg-black/40 border-white/5 text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] bg-white/5 border border-white/10 text-white font-bold">
                      {player.isBot ? "BOT" : player.name[0]}
                    </div>
                    <span className="text-xs font-semibold text-white">
                      {player.name}
                    </span>
                  </div>

                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full">
                    {hasVoted ? (
                      <span className="text-blue-400">הצביע!</span>
                    ) : player.isBot ? (
                      <span className="text-red-400 flex items-center gap-1">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                        </span>
                        מנתח...
                      </span>
                    ) : (
                      <span className="text-purple-400">חורץ גורל...</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-auto bg-red-950/20 border border-red-900/20 p-3.5 rounded-2xl text-[10px] leading-relaxed text-red-400 flex gap-2 items-start">
            <AlertTriangle size={18} className="shrink-0 text-red-500 animate-pulse" />
            <p>
              אם שחקן תמים מודח, המתחזה מתקרב לניצחון! נתחו את הניסוחים של כולם בקפידה רבה.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
