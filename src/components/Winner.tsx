import React from "react";
import { Award, RefreshCw, Bot, User, Home } from "lucide-react";
import { Room } from "../types";

interface WinnerProps {
  room: Room;
  currentPlayerId: string;
  onPlayAgain: () => void;
  onExit: () => void;
}

export default function Winner({ room, currentPlayerId, onPlayAgain, onExit }: WinnerProps) {
  const isHost = room.hostId === currentPlayerId;
  const isImpostorWin = room.status === "winner_impostor";
  const impostor = room.players.find((p) => p.id === room.impostorId);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 text-center" dir="rtl">
      {/* Visual Accent Badge */}
      <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 text-blue-400 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 font-mono">
        🏆 סיום המשחק
      </div>

      {/* Main Announcement Card */}
      <div className="bg-black/40 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden mb-6 flex flex-col items-center backdrop-blur-sm">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
        {/* Background Radial Glow */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-3xl opacity-10 ${isImpostorWin ? "bg-red-500" : "bg-emerald-500"}`}></div>

        {isImpostorWin ? (
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-6xl mb-4">🥷</span>
            <h1 className="text-3xl font-black text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]">המתחזה ניצח במשחק!</h1>
            <p className="text-slate-300 text-sm mt-2.5 max-w-sm leading-relaxed">
              המתחזה הצליח להתל בכולם, להישאר סמוי עד הסוף ולשרוד מבלי להיחשף!
            </p>
          </div>
        ) : (
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-6xl mb-4">🛡️</span>
            <h1 className="text-3xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">השחקנים התמימים ניצחו!</h1>
            <p className="text-slate-300 text-sm mt-2.5 max-w-sm leading-relaxed">
              עבודת צוות נהדרת וזיהוי מוקדם של הרמזים החשודים הובילו לחשיפת המתחזה והדחתו!
            </p>
          </div>
        )}

        {/* Secret revealed data */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-black/40 border border-white/10 p-4 rounded-2xl text-right sm:text-center">
            <span className="text-xs text-white/40 block">המילה הסודית הייתה:</span>
            <span className="text-2xl font-black text-white mt-1 block">
              {room.secretWord || "לא הוגדרה"}
            </span>
            <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-md mt-2.5 inline-block font-mono uppercase tracking-wide">
              קטגוריה: {room.category}
            </span>
          </div>

          <div className="bg-black/40 border border-white/10 p-4 rounded-2xl flex flex-col justify-center">
            <span className="text-xs text-white/40 block">זהות המתחזה:</span>
            <span className="text-xl font-bold text-red-400 mt-2 flex items-center justify-center gap-1.5 font-mono">
              {impostor ? impostor.name : "לא ידוע"}
            </span>
            {impostor?.isBot && (
              <span className="text-[10px] text-white/30 mt-1">
                אישיות: {impostor.botPersonality}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Players List with final standings */}
      <div className="bg-black/40 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden mb-6 backdrop-blur-sm">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
        <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest text-right mb-4 border-b border-white/10 pb-2">רשימת השחקנים בסיום:</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {room.players.map((player) => {
            const isImpostor = player.id === room.impostorId;
            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isImpostor
                    ? "bg-red-950/20 border-red-500/30 text-red-300"
                    : player.isEliminated
                    ? "bg-white/5 border-white/5 opacity-40"
                    : "bg-white/5 border-white/10 text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] bg-white/5 border border-white/10 text-white font-bold">
                    {player.isBot ? "BOT" : player.name[0]}
                  </div>
                  <span className="text-xs font-bold">{player.name}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {isImpostor && (
                    <span className="text-[9px] bg-red-950 border border-red-900/60 text-red-400 px-2 py-0.5 rounded-full font-bold">
                      המתחזה
                    </span>
                  )}
                  {player.isEliminated && (
                    <span className="text-[9px] bg-white/5 border border-white/10 text-slate-400 px-2 py-0.5 rounded-full">
                      הודח
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
        {isHost ? (
          <button
            onClick={onPlayAgain}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-8 rounded-xl transition duration-150 shadow-[0_0_20px_rgba(37,99,235,0.4)] cursor-pointer text-sm"
          >
            <RefreshCw size={16} />
            <span>שחקו שוב באותו חדר!</span>
          </button>
        ) : (
          <div className="bg-white/5 border border-white/10 py-3.5 px-6 rounded-xl text-xs text-slate-400 flex items-center justify-center gap-2 w-full sm:w-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span>ממתינים שמנהל החדר יתחיל משחק חדש...</span>
          </div>
        )}

        <button
          onClick={onExit}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold py-3.5 px-8 rounded-xl transition duration-150 border border-white/10 cursor-pointer text-sm"
        >
          <Home size={16} />
          <span>חזרה לדף הבית</span>
        </button>
      </div>
    </div>
  );
}
