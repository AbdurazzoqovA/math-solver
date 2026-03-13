"use client";

import { useState } from "react";
import { BookOpen, Plus, History, PanelLeftClose, PanelLeftOpen, Trash2 } from "lucide-react";
import { useChatContext } from "@/context/ChatContext";

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true);
  const { chats, activeChatId, createNewChat, switchChat, deleteChat } = useChatContext();

  // Sort chats by most recently updated
  const sortedChats = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <aside className={`h-full bg-transparent flex flex-col py-6 shrink-0 transition-all duration-300 ease-in-out z-20 relative ${isExpanded ? 'w-64' : 'w-20'}`}>
      <div className="flex flex-col h-full bg-card/60 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl mx-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden">
        
        {/* Top Header Area: Toggle + Logo */}
        <div className="flex items-center h-16 w-full mt-2 px-2 relative">
          
          {/* Fixed-Width Toggle Container ensures icon NEVER moves */}
          <div className="w-10 shrink-0 flex items-center justify-center z-10 relative">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
              title={isExpanded ? "Close Sidebar" : "Open Sidebar"}
            >
              {isExpanded ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>
          </div>

          {/* Logo Container (slides/fades in next to it) */}
          <div className={`flex items-center gap-3 transition-all duration-300 absolute left-14 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}`}>
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center font-bold shadow-lg shadow-primary-500/25 shrink-0`}>
              <span className="leading-none text-xl drop-shadow-sm">√</span>
            </div>
            <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 whitespace-nowrap">
              MathSolver
            </span>
          </div>
        </div>

        {/* New Chat Button */}
        <div className={`mt-2 mb-4 transition-all duration-300 flex ${isExpanded ? 'px-4' : 'justify-center w-full'}`}>
          <button 
            onClick={createNewChat}
            className={`flex items-center justify-center gap-3 bg-white dark:bg-zinc-800 text-foreground transition-all shadow-sm border border-black/5 dark:border-white/5 group hover:shadow-md hover:border-black/10 dark:hover:border-white/10 ${isExpanded ? 'w-full px-4 py-3 rounded-2xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02]' : 'w-11 h-11 rounded-[1.25rem] shadow-[0_2px_10px_rgb(0,0,0,0.06)]'}`} 
            title="New Chat"
          >
            <Plus className={`w-5 h-5 group-hover:scale-110 transition-transform ${isExpanded ? 'text-primary-600 dark:text-primary-400' : 'text-blue-600 dark:text-blue-400'}`} />
            {isExpanded && <span className="font-medium text-sm">New Chat</span>}
          </button>
        </div>

        {/* Main Nav */}
        <nav className="flex-1 px-3 py-2 space-y-2 overflow-y-auto custom-scrollbar">
          <button className={`w-full flex items-center gap-3 p-3 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors group ${isExpanded ? 'justify-start px-4' : 'justify-center'}`} title="Practice Tests">
            <BookOpen className="w-5 h-5 group-hover:text-primary-500 transition-colors shrink-0" />
            {isExpanded && <span className="font-medium text-sm truncate">Practice Tests</span>}
          </button>

          {/* Recent Chats Section */}
          <div className={`pt-6 pb-2 transition-opacity duration-300 ${isExpanded ? 'opacity-100 px-4' : 'opacity-0 h-0 overflow-hidden pt-0'}`}>
            <div className="flex items-center text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest mb-3">
              <History className="w-3 h-3 mr-2" />
              Recent
            </div>
            <div className="space-y-1">
              {sortedChats.length === 0 && (
                <p className="text-xs text-muted-foreground/50 italic px-3 py-2">No chats yet</p>
              )}
              {sortedChats.map((chat) => (
                <div key={chat.id} className="group/chat relative">
                  <button
                    onClick={() => switchChat(chat.id)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors truncate pr-9 ${
                      chat.id === activeChatId
                        ? "text-foreground bg-primary-500/10 font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                    title={chat.title}
                  >
                    {chat.title}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(chat.id);
                    }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground/50 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 opacity-0 group-hover/chat:opacity-100 transition-all"
                    title="Delete chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </nav>


      </div>
    </aside>
  );
}
