import React, { useState } from "react";
import { Copy, Check, UserPlus, Bot, Shield, Trash2, Play } from "lucide-react";
import { Room, Player } from "../types";
import { motion } from "motion/react";

interface LobbyProps {
  room: Room;
  currentPlayerId: string;
  onAddBot: (name: string, personality: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onStartGame: () => void;
}

const BOT_TEMPLATES = [
  { name: "רוני הבלש", personality: "בלש קפדן שחושד בכולם ומחפש פרטים קטנים" },
  { name: "עדי החשדנית", personality: "חשדנית מאוד, עצבנית קלות, כותבת משפטים דרמטיים" },
  { name: "יובל התמים", personality: "תמים מאוד, חביב, כותב רמזים פשוטים וברורים מדי" },
  { name: "מיכל הערמומית", personality: "ערמומית, חכמה, מנסה לבלבל את כולם עם רמזים כפולי משמעות" },
  { name: "מקס הגיבור", personality: "בטוח בעצמו, משתמש במילים חזקות, אוהב לנצח" },
  { name: "גיא המצחיק", personality: "ליצן החבר'ה, כותב רמזים קורעים מצחוק, לא לוקח שום דבר ברצינות" },
];

export default function Lobby({ room, currentPlayerId, onAddBot, onRemovePlayer, onStartGame }: LobbyProps) {
  const [copied, setCopied] = useState(false);
  const isHost = room.hostId === currentPlayerId;

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddRandomBot = () => {
    // Filter out bots already in the game
    const currentBotNames = room.players.filter((p) => p.isBot).map((p) => p.name);
    const availableBots = BOT_TEMPLATES.filter((b) => !currentBotNames.includes(b.name));

    if (availableBots.length === 0) {
      alert("כל הבוטים האפשריים כבר נמצאים בחדר!");
      return;
    }

    const randomBot = availableBots[Math.floor(Math.random() * availableBots.length)];
    onAddBot(randomBot.name, randomBot.personality);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4" dir="rtl">
      {/* Lobby Title */}
      <div className="text-center mb-8">
        <span className="text-xs font-bold text-blue-400 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full uppercase tracking-widest font-mono">
          שלב ההמתנה
        </span>
        <h1 className="text-4xl font-black text-white mt-3 tracking-tight">הלובי שלכם</h1>
        <p className="text-slate-400 mt-2 text-sm">הזמינו חברים או הוסיפו בוטים כדי להתחיל לשחק!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Room Code Card */}
        <div className="md:col-span-4 flex flex-col gap-4">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col items-center text-center relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
            
            <h2 className="text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-2">קוד חדר</h2>
            <div className="text-3xl font-black text-white tracking-widest font-mono select-all bg-black/40 border border-white/10 px-4 py-2.5 rounded-xl mb-4 w-full drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
              {room.id}
            </div>
            
            <button
              onClick={copyRoomCode}
              className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-medium text-sm py-2.5 px-4 rounded-xl transition duration-200 border border-white/10"
            >
              {copied ? (
                <>
                  <Check size={16} className="text-emerald-400" />
                  <span className="text-emerald-400">הועתק בהצלחה!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>העתק קוד חדר</span>
                </>
              )}
            </button>
          </div>

          {/* Quick instructions */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-5 shadow-xl text-xs leading-relaxed text-slate-300">
            <h3 className="font-bold text-blue-400 mb-2 font-mono tracking-wide uppercase">איך משחקים?</h3>
            <ul className="list-decimal list-inside space-y-2">
              <li>כל שחקן מקבל מילה סודית, חוץ משחקן אחד שהוא <b className="text-red-400">המתחזה</b>.</li>
              <li>המתחזה יודע רק את <b>קטגוריית העל</b> של המילה.</li>
              <li>כל שחקן כותב בתורו רמז קצר מאוד (מילה או משפט קצר).</li>
              <li>מצביעים על החשוד כמתחזה. בעל מרב הקולות מודח!</li>
              <li>המתחזה מנצח אם הוא שורד עד שנשארו רק הוא ועוד שחקן אחד.</li>
            </ul>
          </div>
        </div>

        {/* Players List Card */}
        <div className="md:col-span-8 bg-black/40 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>
          
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>רשימת המשתתפים</span>
                <span className="text-xs font-bold text-white/50 bg-white/5 px-2.5 py-0.5 rounded-full">
                  {room.players.length} / 10
                </span>
              </h2>

              {isHost && (
                <button
                  onClick={handleAddRandomBot}
                  disabled={room.players.length >= 10}
                  className="flex items-center gap-1.5 text-xs font-bold bg-white/5 hover:bg-white/10 text-blue-400 border border-white/10 px-3.5 py-1.5 rounded-xl transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Bot size={14} />
                  <span>הוסף בוט לחדר</span>
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {room.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition duration-150"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        player.isBot
                          ? "bg-red-900/50 text-red-300 border border-red-500/20"
                          : "bg-gray-700 text-white"
                      }`}
                    >
                      {player.isBot ? "BOT" : <span className="font-bold">{player.name[0]}</span>}
                    </div>

                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold ${player.isBot ? "text-red-300" : player.isHost ? "text-blue-400" : "text-white"} text-sm`}>
                          {player.name}
                        </span>
                        {player.id === currentPlayerId && (
                          <span className="text-[9px] font-bold bg-white/5 text-white/50 border border-white/10 px-1.5 py-0.2 rounded-md">
                            אתה
                          </span>
                        )}
                        {player.isHost && (
                          <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                            <Shield size={10} />
                            מנהל
                          </span>
                        )}
                      </div>
                      {player.isBot && (
                        <span className="text-[9px] text-red-400/80 font-medium mt-0.5">
                          אישיות: {player.botPersonality || "רגילה"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Kick or Delete Button (Only host can remove bots/other players) */}
                  {isHost && player.id !== currentPlayerId && (
                    <button
                      onClick={() => onRemovePlayer(player.id)}
                      className="text-white/30 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/30 transition duration-150"
                      title={player.isBot ? "הסר בוט" : "הדח שחקן"}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 border-t border-white/10 pt-4 flex flex-col gap-3">
            {isHost ? (
              <button
                onClick={onStartGame}
                disabled={room.players.length < 3}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-6 rounded-xl transition duration-200 shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-base cursor-pointer"
              >
                <Play size={18} fill="currentColor" />
                <span>התחל את המשחק!</span>
              </button>
            ) : (
              <div className="text-center text-xs py-2 bg-black/40 border border-white/10 rounded-xl text-slate-400 flex items-center justify-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <span>ממתינים למנהל החדר שיתחיל את המשחק...</span>
              </div>
            )}

            {room.players.length < 3 && (
              <p className="text-[10px] text-center text-amber-500 font-medium font-mono">
                * יש צורך בלפחות 3 שחקנים (כולל בוטים) כדי להתחיל במשחק!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
