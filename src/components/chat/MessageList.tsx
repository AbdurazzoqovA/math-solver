import { CheckCircle2, Copy, Edit2, ThumbsUp, ThumbsDown, RotateCcw, Video, FileText } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isCorrect?: boolean;
  images?: { url: string; ocrText: string }[]; // Replace singular imageUrl / ocrText
};

// Pre-process LaTeX delimiters from OpenAI's default \( \) and \[ \] to remark-math's required $ and $$
const preprocessLaTeX = (content: string) => {
  let processed = content;
  // Replace block math \[ ... \] with $$ ... $$
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `$$${math}$$`);
  // Replace inline math \( ... \) with $ ... $
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math}$`);
  return processed;
};

export default function MessageList({ 
  messages, 
  isLoading 
}: { 
  messages: Message[];
  isLoading?: boolean;
}) {
  return (
    <div className="flex flex-col gap-12">
      {messages.map((message) => (
        <div key={message.id} className="group w-full">
          {message.role === 'user' ? (
            <div className="flex justify-end ml-auto max-w-[85%] relative">
               <div className="absolute top-2 -left-12 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors" title="Edit message">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-primary-600 text-white px-5 py-4 rounded-3xl rounded-tr-sm shadow-sm leading-relaxed relative flex flex-col items-end">
                {message.images && message.images.length > 0 && (
                  <div className="mb-3 flex flex-row gap-2 overflow-x-auto pb-2 w-full justify-end max-w-full">
                    {message.images.map((img, index) => (
                      <div key={index} className="relative group/img cursor-pointer shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={img.url} 
                          alt={`Uploaded problem ${index + 1}`} 
                          className="max-w-[200px] sm:max-w-[280px] rounded-xl shadow-md border-2 border-primary-500/30 object-contain max-h-[160px] bg-white dark:bg-zinc-800" 
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="prose md:prose-lg max-w-none text-white leading-relaxed prose-p:m-0 prose-math:text-white dark:prose-math:text-white">
                  <ReactMarkdown 
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {preprocessLaTeX(message.content)}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 md:gap-6 max-w-full">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shrink-0 flex items-center justify-center text-white mt-1 shadow-md shadow-primary-500/20">
                <span className="font-bold text-lg drop-shadow-sm">√</span>
              </div>
              <div className="flex-1 w-full max-w-[calc(100%-3rem)] md:max-w-[calc(100%-4rem)] overflow-hidden pt-1">
                
                {message.isCorrect && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium text-sm mb-4">
                    <CheckCircle2 className="w-4 h-4" />
                    Correct Approach
                  </div>
                )}
                
                {/* Advanced Markdown Rendering */}
                <div className="prose md:prose-lg max-w-none text-foreground leading-loose text-[1.1rem] dark:prose-invert prose-p:my-5 prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-800/50 prose-pre:border prose-pre:border-black/5 dark:prose-pre:border-white/5 prose-math:text-primary-600 dark:prose-math:text-primary-400 [&_.math-display]:my-8 [&_.math-display]:text-xl md:[&_.math-display]:text-2xl [&_.math-display]:tracking-wider [&>hr]:my-12 [&>hr]:border-t-2 [&>hr]:border-black/5 dark:[&>hr]:border-white/5 [&>hr]:w-[calc(100%+2rem)] [&>hr]:-ml-4">
                  <ReactMarkdown 
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {preprocessLaTeX(message.content)}
                  </ReactMarkdown>
                </div>

                {/* Elegant Action Strip */}
                <div className="mt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Primary Actions */}
                    <div className="flex items-center gap-1.5 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md p-1 rounded-xl border border-black/5 dark:border-white/5 shadow-sm">
                      <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                        <FileText className="w-3.5 h-3.5 text-primary-500" />
                        Practice Test
                      </button>
                      <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                        <Video className="w-3.5 h-3.5 text-primary-500" />
                        Video lesson
                      </button>
                    </div>
                    
                    <div className="flex-1" />
                    
                    {/* Feedback Actions */}
                    <div className="flex items-center gap-0.5 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md p-1 rounded-xl border border-black/5 dark:border-white/5 shadow-sm">
                      <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors" title="Copy">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors" title="Regenerate">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <div className="w-px h-4 mx-1.5 bg-border" />
                      <button className="p-2 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors" title="Good response">
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors" title="Bad response">
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      ))}

      {/* Loading Skeleton */}
      {isLoading && messages[messages.length - 1]?.role === 'user' && (
        <div className="group w-full flex gap-4 md:gap-6 max-w-full animate-pulse">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-200 to-primary-300 dark:from-primary-900/50 dark:to-primary-800/50 shrink-0 flex items-center justify-center text-white mt-1 shadow-sm">
             <span className="font-bold text-lg opacity-50">√</span>
          </div>
          <div className="flex-1 w-full max-w-[calc(100%-3rem)] md:max-w-[calc(100%-4rem)] pt-2 space-y-3">
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-full w-3/4"></div>
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-full w-1/2"></div>
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-full w-5/6"></div>
          </div>
        </div>
      )}
    </div>
  );
}
