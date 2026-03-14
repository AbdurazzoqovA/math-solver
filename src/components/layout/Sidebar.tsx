"use client";

import { useState, useEffect } from "react";
import { BookOpen, Plus, History, PanelLeftClose, PanelLeftOpen, Trash2, Sun, Moon, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter, usePathname } from "next/navigation";
import { useChatContext } from "@/context/ChatContext";
import { useUI } from "@/context/UIContext";
import Image from "next/image";
import Link from "next/link";

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true);
  const { chats, activeChatId, createNewChat, switchChat, deleteChat } = useChatContext();
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useUI();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  const isOnPracticeTests = pathname === "/practice-tests";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sort chats by most recently updated
  const sortedChats = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);

  // Close mobile sidebar on navigation
  const handleChatSwitch = (chatId: string) => {
    switchChat(chatId);
    setMobileSidebarOpen(false);
    if (isOnPracticeTests) router.push("/");
  };

  const handleNewChat = () => {
    createNewChat();
    setMobileSidebarOpen(false);
    if (isOnPracticeTests) router.push("/");
  };

  const handlePracticeTestsClick = () => {
    setMobileSidebarOpen(false);
    router.push("/practice-tests");
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-card/60 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl mx-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden">
      
      {/* Top Header Area: Toggle + Logo */}
      <div className="flex items-center h-16 w-full mt-2 px-2 relative">
        
        {/* Desktop: sidebar collapse toggle | Mobile: close button */}
        <div className="w-10 shrink-0 flex items-center justify-center z-10 relative">
          {/* Desktop toggle */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="hidden md:flex p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
            title={isExpanded ? "Close Sidebar" : "Open Sidebar"}
          >
            {isExpanded ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>
          {/* Mobile close */}
          <button 
            onClick={() => setMobileSidebarOpen(false)}
            className="flex md:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
            title="Close Sidebar"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>

        {/* Logo Container (slides/fades in next to it) */}
        <div className={`flex items-center gap-3 transition-all duration-300 absolute left-14 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'} md:transition-all`}>
          <div className="w-9 h-9 shrink-0 flex items-center justify-center">
            <Image 
              src="/icons8-math-40.png" 
              alt="MathSolver Logo" 
              width={36} 
              height={36} 
              className="object-contain"
            />
          </div>
          <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 whitespace-nowrap">
            MathSolver
          </span>
        </div>
      </div>

      {/* New Chat Button */}
      <div className={`mt-2 mb-4 transition-all duration-300 flex ${isExpanded ? 'px-4' : 'md:justify-center md:w-full justify-center'}`}>
        <button 
          onClick={handleNewChat}
          className={`flex items-center justify-center gap-3 bg-white dark:bg-zinc-800 text-foreground transition-all shadow-sm border border-black/5 dark:border-white/5 group hover:shadow-md hover:border-black/10 dark:hover:border-white/10 ${isExpanded ? 'w-full px-4 py-3 rounded-2xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02]' : 'md:w-11 md:h-11 w-full px-4 py-3 md:px-0 md:py-0 rounded-[1.25rem] shadow-[0_2px_10px_rgb(0,0,0,0.06)]'}`} 
          title="New Chat"
        >
          <Plus className={`w-5 h-5 group-hover:scale-110 transition-transform ${isExpanded ? 'text-primary-600 dark:text-primary-400' : 'text-blue-600 dark:text-blue-400'}`} />
          {isExpanded && <span className="font-medium text-sm">New Chat</span>}
          {/* On mobile when collapsed, still show label */}
          {!isExpanded && <span className="font-medium text-sm md:hidden">New Chat</span>}
        </button>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 py-2 space-y-2 overflow-y-auto custom-scrollbar">
        <button 
          onClick={handlePracticeTestsClick}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors group ${isExpanded ? 'justify-start px-4' : 'justify-center'} ${isOnPracticeTests ? 'text-primary-600 dark:text-primary-400 bg-primary-500/10 font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'}`}
          title="Practice Tests"
        >
          <BookOpen className={`w-5 h-5 transition-colors shrink-0 ${isOnPracticeTests ? 'text-primary-500' : 'group-hover:text-primary-500'}`} />
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
                  onClick={() => handleChatSwitch(chat.id)}
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
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground/50 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 opacity-0 group-hover/chat:opacity-100 [@media(hover:none)]:opacity-100 transition-all"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-black/5 dark:border-white/5 shrink-0 flex flex-col gap-2">
        <button 
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className={`w-full flex items-center p-3 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors group ${isExpanded ? 'justify-start px-4 gap-3' : 'justify-center'}`}
          title="Toggle Theme"
        >
          {mounted ? (
            theme === "dark" ? <Moon className="w-5 h-5 shrink-0 group-hover:text-primary-500 transition-colors" /> : <Sun className="w-5 h-5 shrink-0 group-hover:text-primary-500 transition-colors" />
          ) : (
            <Sun className="w-5 h-5 shrink-0 group-hover:text-primary-500 transition-colors" />
          )}
          {isExpanded && <span className="font-medium text-sm truncate">Theme</span>}
        </button>

        <div className={`flex flex-col gap-1 mt-2 text-xs text-muted-foreground/60 transition-all duration-300 ${isExpanded ? 'px-4 opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
          <Link href="/privacy" className="hover:text-foreground transition-colors py-1 truncate">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors py-1 truncate">Terms of Service</Link>
        </div>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Sidebar — hidden on mobile */}
      <aside className={`hidden md:flex h-full bg-transparent flex-col py-6 shrink-0 transition-all duration-300 ease-in-out z-20 relative ${isExpanded ? 'w-64' : 'w-20'}`}>
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar — overlay drawer */}
      {isMobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileSidebarOpen(false)}
          />
          {/* Drawer */}
          <aside className="absolute top-0 left-0 h-full w-72 bg-transparent flex flex-col py-4 z-10 animate-in slide-in-from-left duration-300">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
