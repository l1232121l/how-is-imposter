import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";
import { Message, Player } from "../types";

interface ChatProps {
  messages: Message[];
  players: Player[];
  currentPlayerId: string;
  onSendMessage: (text: string) => void;
}

export default function Chat({ messages, players, currentPlayerId, onSendMessage }: ChatProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText("");
  };

  const getPlayerNameColor = (senderId: string) => {
    if (senderId === "system") return "text-amber-500 font-bold font-mono";
    const player = players.find((p) => p.id === senderId);
    if (!player) return "text-slate-400";
    if (player.id === currentPlayerId) return "text-blue-400 font-bold";
    if (player.isBot) return "text-red-400 font-medium";
    return "text-slate-300";
  };

  return (
    <div className="flex flex-col h-full bg-black/40 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative backdrop-blur-sm">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
      
      {/* Header */}
      <div className="bg-white/5 px-4 py-3.5 border-b border-white/10 flex items-center justify-between" dir="rtl">
        <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-2">
          <span>צאט החדר (רמזים ודיונים)</span>
        </h3>
        <span className="text-[10px] bg-white/5 text-slate-300 px-2.5 py-0.5 rounded-full font-mono font-bold border border-white/10">
          {messages.length} הודעות
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[150px] max-h-[350px] lg:max-h-none flex flex-col" dir="rtl">
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 my-auto py-8">
            <p className="text-xs">אין הודעות בחדר עדיין. כתבו משהו!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSystem = msg.senderId === "system";
            const sender = players.find((p) => p.id === msg.senderId);
            const isBot = sender?.isBot;

            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${
                  msg.senderId === currentPlayerId ? "mr-auto items-start" : "ml-auto items-end"
                }`}
              >
                {/* Sender Name */}
                {!isSystem && (
                  <span className={`text-[10px] mb-1 px-1 flex items-center gap-1 ${getPlayerNameColor(msg.senderId)}`}>
                    {isBot ? <Bot size={10} className="text-red-400" /> : <User size={10} />}
                    {msg.senderName}
                  </span>
                )}

                {/* Bubble */}
                <div
                  className={`px-3 py-2 text-xs rounded-2xl leading-relaxed break-words ${
                    isSystem
                      ? "bg-amber-950/20 border border-amber-500/20 text-amber-200/90 rounded-lg text-center w-full max-w-full font-medium"
                      : msg.senderId === currentPlayerId
                      ? "bg-blue-600 text-white rounded-tr-none shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                      : isBot
                      ? "bg-red-950/20 border border-red-900/30 text-red-100 rounded-tl-none"
                      : "bg-white/5 border border-white/10 text-slate-200 rounded-tl-none"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-black/40 flex gap-2 animate-none" dir="rtl">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="כתבו הודעה או רמז לשחקנים..."
          className="flex-1 bg-black/40 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all placeholder-white/20 text-right"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl transition duration-200 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
