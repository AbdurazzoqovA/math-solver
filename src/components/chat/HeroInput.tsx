import { Calculator, FunctionSquare, ArrowUpCircle, ImagePlus } from "lucide-react";

export default function HeroInput({ onSubmit }: { onSubmit: () => void }) {
  return (
    <div className="w-full max-w-3xl mx-auto mt-6">
      <div className="bg-white/70 dark:bg-zinc-900/50 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/5 dark:border-white/5 overflow-hidden transition-all focus-within:ring-2 focus-within:ring-primary-500/30 focus-within:shadow-[0_8px_40px_rgb(0,0,0,0.08)] text-left">
        
        {/* Prominent Drag & Drop / Upload Zone */}
        <div className="w-full border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-6 flex flex-col items-center justify-center gap-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer group">
          <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center group-hover:scale-110 group-hover:shadow-md transition-all">
            <ImagePlus className="w-6 h-6 text-primary-500" />
          </div>
          <p className="text-base font-medium text-muted-foreground mt-1">
            Drag & drop or <span className="text-primary-600 dark:text-primary-400">click to upload</span> an image or PDF
          </p>
        </div>

        {/* Text Input Area */}
        <div className="p-3">
          <textarea 
            rows={2}
            placeholder="Type your math problem here..."
            className="w-full bg-transparent border-none focus:outline-none resize-none px-4 py-3 text-foreground placeholder:text-muted-foreground/80 min-h-[60px] text-lg leading-relaxed"
          />
          
          <div className="flex items-center justify-between mt-2 px-2 pb-1 relative">
            <div className="flex items-center gap-2">
              <button 
                className="flex items-center justify-center p-2.5 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors group" 
                title="Calculator"
              >
                <Calculator className="w-5 h-5 group-hover:text-primary-500 transition-colors" />
              </button>
              
              <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors group">
                <FunctionSquare className="w-5 h-5 group-hover:text-primary-500 transition-colors" />
                <span>Math Tool</span>
              </button>
            </div>
            
            {/* Click to initiate chat state */}
            <button 
              onClick={onSubmit}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white flex items-center justify-center shadow-lg shadow-primary-500/25 transition-all outline-none scale-95 hover:scale-100 active:scale-95"
            >
              <ArrowUpCircle className="w-7 h-7" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
