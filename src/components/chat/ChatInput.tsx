import { Calculator, FunctionSquare, Send, ArrowUpCircle, Paperclip } from "lucide-react";

export default function ChatInput() {
  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
      
      {/* Floating Command Bar */}
      <div className="w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-black/5 dark:border-white/10 overflow-hidden transition-all focus-within:ring-2 focus-within:ring-primary-500/30 focus-within:shadow-[0_8px_40px_rgb(0,0,0,0.12)] focus-within:bg-white dark:focus-within:bg-zinc-900">
        
        <div className="p-2 flex flex-col">
          <textarea 
            rows={1}
            placeholder="Ask a math question, upload an image, or type an equation..."
            className="w-full bg-transparent border-none focus:outline-none resize-none px-4 py-3 text-foreground placeholder:text-muted-foreground/70 min-h-[52px] text-[15px] leading-relaxed"
          />
          
          <div className="flex items-center justify-between px-2 pb-1 mt-1">
            <div className="flex items-center gap-1">
              <button 
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors" 
                aria-label="Attach File"
                title="Attach image or PDF"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              
              <div className="w-px h-5 mx-1 bg-border" />
              
              <button className="flex items-center justify-center p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors group" title="Calculator">
                <Calculator className="w-5 h-5 group-hover:text-primary-500 transition-colors" />
              </button>
              
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors group">
                <FunctionSquare className="w-5 h-5 group-hover:text-primary-500 transition-colors" />
                <span className="hidden sm:inline">Math Input</span>
              </button>
            </div>
            
            <button className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white flex items-center justify-center shadow-lg shadow-primary-500/25 transition-all outline-none scale-95 hover:scale-100 active:scale-95">
              <ArrowUpCircle className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="text-center mt-4">
        <p className="text-[11px] text-muted-foreground/60 w-full max-w-md font-medium">
          MathSolver can make mistakes. Please verify important calculations.
        </p>
      </div>
    </div>
  );
}
