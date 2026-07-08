import React from "react";
import { Award, ChevronLeft, Frown, Sparkles, RefreshCw, Bot, User } from "lucide-react";
import { Room, Player } from "../types";

interface EliminationProps {
  room: Room;
  currentPlayerId: string;
  onNextRound: () => void;
  onEndGame: () => void;
}

export default function Elimination({ room, currentPlayerId, onNextRound, onEndGame }: EliminationProps) {
  const isHost = room.hostId === currentPlayerId;

  // Find the player who was eliminated in this round
  const eliminatedPlayerName = room.revealedPlayerName;
  const wasImpostor = room.revealedPlayerIsImpostor;

  // Compile vote counts
  const voteTallies = room.players.map((p) => {
    const votesFrom = room.players.filter((other) => other.votedFor === p.id);
    return {
      player: p,
      votesCount: votesFrom.length,
      voters: votesFrom.map((v) => v.name),
    };
  }).sort((a, b) => b.votesCount - a.votesCount);

  // Bots' voting decisions with reasons
  const botDecisions = room.players.filter((p) => p.isBot && p.votedFor && !p.isEliminated);

  // Determine if the game has officially ended based on room status
  const isGameOver = room.status === "winner_players" || room.status === "winner_impostor";

  return (
    <div className="max-w-4xl mx-auto py-6 px-4" dir="rtl">
      {/* Title */}
      <div className="text-center mb-8">
        <span className="text-xs font-bold text-red-400 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full uppercase tracking-widest font-mono">
          תוצאות ההצבעה
        </span>
        <h1 className="text-3xl font-black text-white mt-3">חשיפת התוצאות הדרמטית!</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Main Tally Column */}
        <div className="md:col-span-8 flex flex-col gap-6">
          {/* Card: The Reveal */}
          <div className="bg-black/40 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden text-center flex flex-col items-center backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
            
            {wasImpostor ? (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-emerald-950 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-4xl shadow-lg shadow-emerald-500/10 mb-4">
                  🎉
                </div>
                <h2 className="text-2xl font-black text-emerald-400">תפיסה מעולה!</h2>
                <p className="text-slate-200 font-bold mt-2 text-lg">
                  {eliminatedPlayerName} הודח/ה והוא/היא אכן היה המתחזה!
                </p>
                <p className="text-slate-400 text-xs mt-1.5 max-w-sm leading-relaxed">
                  הצלחתם לגלות ולנטרל את האיום. השחקנים התמימים ניצחו את הסיבוב!
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-red-950 text-red-400 border border-red-500/30 rounded-2xl flex items-center justify-center text-4xl shadow-lg shadow-red-500/10 mb-4">
                  💔
                </div>
                <h2 className="text-2xl font-black text-red-400">אוי לא! טעות מרה...</h2>
                <p className="text-slate-200 font-bold mt-2 text-lg">
                  {eliminatedPlayerName} הודח/ה מהמשחק, אך הם היו שחקן תמים!
                </p>
                <p className="text-slate-400 text-xs mt-1.5 max-w-sm leading-relaxed">
                  המתחזה האמיתי עדיין מסתובב חופשי ביניכם ומחייך בערמומיות...
                </p>
              </div>
            )}
          </div>

          {/* Vote tally detailed bars */}
          <div className="bg-black/40 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-4 pb-2 border-b border-white/10">פירוט קולות ההצבעה:</h3>
            
            <div className="space-y-4">
              {voteTallies.map(({ player, votesCount, voters }) => {
                if (player.isEliminated && votesCount === 0) return null; // Don't show inactive with 0 votes
                const percentage = Math.max(5, (votesCount / room.players.filter((p) => !p.isEliminated).length) * 100);

                return (
                  <div key={player.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold ${player.isEliminated ? "text-slate-500 line-through" : "text-white"}`}>
                          {player.name}
                        </span>
                        {player.id === room.impostorId && isGameOver && (
                          <span className="text-[9px] bg-red-950 border border-red-900 text-red-400 px-1.5 py-0.2 rounded font-semibold font-mono uppercase tracking-wide">
                            המתחזה
                          </span>
                        )}
                        {player.isBot && (
                          <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.2 rounded font-mono font-bold">
                            בוט
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-white/40">
                        {votesCount} {votesCount === 1 ? "קול" : "קולות"}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-black/60 h-2.5 rounded-full overflow-hidden border border-white/5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          player.name === eliminatedPlayerName ? "bg-red-500" : "bg-blue-600/70"
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>

                    {/* Who voted for them */}
                    {voters.length > 0 && (
                      <p className="text-[10px] text-white/30 font-medium">
                        הצביעו עבורו: {voters.join(", ")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bot reasoning / Sidebar Column */}
        <div className="md:col-span-4 bg-white/5 border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
          <h3 className="text-[10px] uppercase tracking-widest text-blue-400 font-bold border-b border-white/10 pb-2">מה אומרים הבוטים?</h3>
          
          <div className="space-y-3.5 flex-1 max-h-[250px] md:max-h-none overflow-y-auto pr-1">
            {botDecisions.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-4">הבוטים לא הצביעו או שאין בוטים בסיבוב הזה.</p>
            ) : (
              botDecisions.map((bot) => {
                // Find vote reason if set (or construct a funny mock since Firestore updates we can add)
                const votedPlayerName = room.players.find((p) => p.id === bot.votedFor)?.name;
                return (
                  <div key={bot.id} className="bg-black/40 p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Bot size={12} className="text-red-400" />
                      <span className="text-xs font-bold text-red-300">{bot.name}</span>
                    </div>
                    <p className="text-slate-300 text-xs italic leading-relaxed">
                      "הצבעתי ל-<b>{votedPlayerName}</b> כי הרמז שלו לא נשמע לי הגיוני ומחשיד אותו מאוד!"
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Action buttons (Host controls transitions) */}
          <div className="border-t border-white/10 pt-4 mt-auto">
            {isHost ? (
              isGameOver ? (
                <button
                  onClick={onEndGame}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition duration-150 shadow-[0_0_20px_rgba(37,99,235,0.4)] cursor-pointer text-sm"
                >
                  <Award size={16} />
                  <span>מעבר למסך המנצחים</span>
                </button>
              ) : (
                <button
                  onClick={onNextRound}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition duration-150 shadow-[0_0_20px_rgba(37,99,235,0.4)] cursor-pointer text-sm"
                >
                  <ChevronLeft size={16} />
                  <span>המשך לסיבוב הבא</span>
                </button>
              )
            ) : (
              <div className="text-center text-xs py-2 bg-black/40 border border-white/5 rounded-xl text-slate-400 animate-pulse">
                {isGameOver ? "ממתינים שהמארח יעביר למסך הסיום..." : "ממתינים שהמארח יתחיל את הסיבוב הבא..."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
