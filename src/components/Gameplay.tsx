import React, { useState, useEffect } from "react";
import { HelpCircle, Eye, EyeOff, Bot, Send, User, CheckCircle2 } from "lucide-react";
import { Room, Player } from "../types";

interface GameplayProps {
  room: Room;
  currentPlayerId: string;
  onSelectClue: (clue: string) => void;
  // Callback for when the host is requested to process bots
  onProcessBotsClues: () => void;
}

export default function Gameplay({ room, currentPlayerId, onSelectClue, onProcessBotsClues }: GameplayProps) {
  const [clueInput, setClueInput] = useState("");
  const [isWordVisible, setIsWordVisible] = useState(true);

  const me = room.players.find((p) => p.id === currentPlayerId);
  const isHost = room.hostId === currentPlayerId;
  const isEliminated = me?.isEliminated;
  const isImpostor = room.impostorId === currentPlayerId;

  const activePlayers = room.players.filter((p) => !p.isEliminated);
  const submittedPlayers = activePlayers.filter((p) => p.submittedClue || p.currentClue);
  const missingPlayers = activePlayers.filter((p) => !p.submittedClue && !p.currentClue);

  // Host runs bot clues generator when appropriate
  useEffect(() => {
    if (isHost && room.status === "playing") {
      const activeBots = room.players.filter((p) => p.isBot && !p.isEliminated);
      const botsWithoutClues = activeBots.filter((p) => !p.submittedClue && !p.currentClue);
      if (botsWithoutClues.length > 0) {
        onProcessBotsClues();
      }
    }
  }, [isHost, room.status, room.players, onProcessBotsClues]);

  const handleSubmitClue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clueInput.trim() || me?.submittedClue) return;
    onSelectClue(clueInput.trim());
    setClueInput("");
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4" dir="rtl">
      {/* Top Header */}
      <div className="bg-black/40 border border-white/10 rounded-3xl p-4 shadow-2xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden backdrop-blur-sm">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
        <div>
          <span className="text-xs font-bold text-blue-400 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full uppercase tracking-widest font-mono">
            שלב הרמזים - סיבוב {room.currentRound}
          </span>
          <h2 className="text-lg font-bold text-white mt-2.5">רשמו רמז שקשור למילה הסודית שלכם!</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">הוגשו רמזים:</span>
          <span className="text-xs font-bold bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3.5 py-1.5 rounded-full font-mono">
            {submittedPlayers.length} מתוך {activePlayers.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Main Section */}
        <div className="md:col-span-8 flex flex-col gap-6">
          {/* Card: Secret Word info */}
          <div className="bg-black/40 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>
            
            {isEliminated ? (
              <div className="text-center py-4">
                <span className="text-3xl">👻</span>
                <h3 className="text-xl font-bold text-red-400 mt-3">הודחת מהמשחק</h3>
                <p className="text-slate-400 text-sm mt-1">כעת באפשרותך לצפות בשאר השחקנים משחקים ורושמים את הרמזים שלהם.</p>
              </div>
            ) : isImpostor ? (
              <div>
                <h3 className="text-red-400 font-extrabold text-lg flex items-center gap-1.5 mb-2 font-mono tracking-wide uppercase">
                  <span>🤫 אתה המתחזה!</span>
                </h3>
                <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                  אינך יודע מה המילה הסודית ששאר השחקנים קיבלו. עליך לכתוב רמז חכם שקשור לקטגוריית העל שלמטה כדי לנסות להישאר סמוי!
                </p>
                <div className="bg-red-950/20 border border-red-900/30 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest block">קטגוריית המילה</span>
                    <span className="text-2xl font-black text-red-200 mt-1 block">{room.category}</span>
                  </div>
                  <HelpCircle size={32} className="text-red-800" />
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-blue-400 font-bold text-sm mb-2 flex items-center gap-1 font-mono uppercase tracking-widest">
                  <span>🔑 המילה הסודית שלך</span>
                </h3>
                <p className="text-slate-300 text-xs mb-4">
                  כתבו רמז קצר מאוד (מילה או שתיים). אל תהיו ברורים מדי כדי שהמתחזה לא יגלה את המילה, אך אל תהיו מנותקים כדי שלא יחשדו בכם!
                </p>
                <div className="bg-black/40 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-white/40 uppercase tracking-widest block">המילה שלך היא:</span>
                    <span className={`text-2xl font-black text-white mt-1 block transition-all tracking-wide ${isWordVisible ? "blur-none" : "blur-md select-none"} drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]`}>
                      {room.secretWord}
                    </span>
                    <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-md mt-2.5 inline-block font-mono uppercase tracking-wide">
                      קטגוריה: {room.category}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsWordVisible(!isWordVisible)}
                    className="text-white/60 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 transition duration-150 border border-white/10"
                    title={isWordVisible ? "הסתר מילה" : "הצג מילה"}
                  >
                    {isWordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Form to submit clue */}
          {!isEliminated && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-sm">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
              <h3 className="text-sm font-bold text-white/50 mb-3 uppercase tracking-wider">הזנת הרמז שלך לסיבוב זה</h3>
              
              {me?.submittedClue || me?.currentClue ? (
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-center gap-3 text-blue-400">
                  <CheckCircle2 size={24} />
                  <div>
                    <p className="text-sm font-bold">הרמז שלך הוגש בהצלחה!</p>
                    <p className="text-xs text-blue-300 mt-0.5 font-mono">רשמת: "{me?.currentClue}"</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitClue} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={clueInput}
                    onChange={(e) => setClueInput(e.target.value)}
                    placeholder="הקלידו רמז (למשל: ירוק, עגול, טעים...)"
                    maxLength={35}
                    required
                    className="flex-1 bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all placeholder-white/20 text-right font-medium"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition duration-150 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.4)] cursor-pointer"
                  >
                    <Send size={16} />
                    <span>שלח רמז</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* List of submitted clues */}
          <div className="bg-black/40 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>
            <h3 className="text-sm font-bold text-white/70 mb-4 pb-2 border-b border-white/10">רמזים שהוגשו עד כה:</h3>
            <div className="space-y-2">
              {submittedPlayers.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-4">אף שחקן לא הגיש רמז עדיין...</p>
              ) : (
                submittedPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-white/5 border border-white/5 hover:border-blue-500/30 rounded-xl transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${player.isBot ? "bg-red-900/50 text-red-300 border border-red-500/20" : "bg-gray-700 text-white"}`}>
                        {player.isBot ? "BOT" : player.name[0]}
                      </div>
                      <span className="font-semibold text-white text-xs">{player.name}</span>
                    </div>
                    <span className="text-sm font-black text-blue-400 bg-blue-500/10 px-4 py-2 rounded-xl border border-blue-500/20 font-mono tracking-wide">
                      {player.currentClue}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Players / Status Section */}
        <div className="md:col-span-4 bg-white/5 border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
          <h3 className="text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-2 border-b border-white/10 pb-2">מצב השחקנים</h3>
          
          <div className="space-y-2.5">
            {room.players.map((player) => {
              const hasSubmitted = player.submittedClue || player.currentClue;
              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                    player.isEliminated
                      ? "bg-white/5 border-white/5 opacity-40"
                      : hasSubmitted
                      ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                      : "bg-black/40 border-white/5 text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] bg-white/5 border border-white/10 text-white font-bold">
                      {player.isBot ? "BOT" : player.name[0]}
                    </div>
                    <span className={`text-xs font-semibold ${player.isEliminated ? "line-through text-slate-500" : "text-white"}`}>
                      {player.name}
                    </span>
                  </div>

                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full">
                    {player.isEliminated ? (
                      "מודח"
                    ) : hasSubmitted ? (
                      <span className="text-blue-400">הגיש!</span>
                    ) : player.isBot ? (
                      <span className="text-red-400 flex items-center gap-1">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                        </span>
                        חושב...
                      </span>
                    ) : (
                      <span className="text-purple-400">חושב...</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Prompt explaining what's next */}
          <div className="mt-auto bg-white/5 border border-white/10 p-3.5 rounded-2xl text-[11px] leading-relaxed text-slate-300">
            {missingPlayers.length > 0 ? (
              <p>מחכים ש-{missingPlayers.length} שחקנים יגישו את הרמז שלהם לפני שנעבור לשלב ההצבעות!</p>
            ) : (
              <p>כל הרמזים הוגשו! עוברים לשלב ההצבעות המותח...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
