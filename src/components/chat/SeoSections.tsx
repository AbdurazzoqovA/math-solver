import { Calculator, Camera, BookOpen, LineChart, Zap, MessageCircle } from "lucide-react";

export default function SeoSections() {
  return (
    <div className="w-full px-4 relative z-10 mt-8 mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
      
      {/* Block 1: What makes MathSolver different */}
      <div className="flex justify-center">
        <div className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm w-full max-w-5xl rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm">
          <h2 className="text-center text-2xl sm:text-3xl font-medium dark:text-gray-200 text-foreground">
            Solve Any Math Problem in Seconds
          </h2>
          <div className="flex text-gray-500 dark:text-zinc-400 flex-col gap-4 mt-5 leading-relaxed">
            <p>Struggling with a tough equation? MathSolver is a free online math solver that turns complex problems into clear, step-by-step answers. Just type your equation, paste a word problem, or snap a photo of your homework and our AI does the rest.</p>
            <p>From basic algebra and geometry to advanced calculus and statistics, MathSolver doesn&apos;t just give you the final answer. It shows you exactly how to get there, explaining every step along the way so you can learn the method and apply it on your own next time.</p>
          </div>
        </div>
      </div>

      {/* Block 2: Core Features */}
      <div className="flex justify-center mt-16">
        <div className="w-full max-w-5xl">
          <h2 className="text-center text-2xl sm:text-3xl font-medium dark:text-gray-200 text-foreground">
            Everything You Need to Solve Math
          </h2>
          <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="gap-2 flex flex-col bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm hover:-translate-y-1 transition-transform">
              <div className="flex flex-row gap-2 justify-center items-center flex-wrap">
                <Calculator className="w-[30px] h-[30px] text-blue-500" strokeWidth={2} />
                <h3 className="font-normal text-xl text-center dark:text-gray-200 text-foreground">Step-by-Step Solutions</h3>
              </div>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm lg:text-base mt-2">
                No more guessing where you went wrong. MathSolver shows each calculation as a separate, numbered step with a plain-language explanation. You&apos;ll see exactly which formula was applied and why, whether it&apos;s factoring a quadratic, computing a derivative, or simplifying a fraction.
              </p>
            </div>

            <div className="gap-2 flex flex-col bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm hover:-translate-y-1 transition-transform">
              <div className="flex flex-row gap-2 justify-center items-center flex-wrap">
                <Camera className="w-[30px] h-[30px] text-blue-500" strokeWidth={2} />
                <h3 className="font-normal text-xl text-center dark:text-gray-200 text-foreground">Photo Math Solver</h3>
              </div>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm lg:text-base mt-2">
                Take a picture of any handwritten or printed problem and drop it into MathSolver. Our image recognition reads the equation, converts it to text, and solves it on the spot. Perfect for quickly working through textbook exercises or checking your handwritten work.
              </p>
            </div>

            <div className="gap-2 flex flex-col bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm hover:-translate-y-1 transition-transform">
              <div className="flex flex-row gap-2 justify-center items-center flex-wrap">
                <BookOpen className="w-[30px] h-[30px] text-blue-500" strokeWidth={2} />
                <h3 className="font-normal text-xl text-center dark:text-gray-200 text-foreground">Practice Quizzes</h3>
              </div>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm lg:text-base mt-2">
                Reading solutions is one thing, but testing yourself is where real learning happens. Generate a custom quiz on any topic and difficulty level to check whether you truly understand the material before exam day.
              </p>
            </div>

            <div className="gap-2 flex flex-col bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm hover:-translate-y-1 transition-transform">
              <div className="flex flex-row gap-2 items-center justify-center flex-wrap">
                <LineChart className="w-[30px] h-[30px] text-blue-500" strokeWidth={2} />
                <h3 className="font-normal text-xl text-center dark:text-gray-200 text-foreground">Graphing Calculator</h3>
              </div>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm lg:text-base mt-2">
                Plot functions, find intersections, and see how equations behave, all inside your browser. MathSolver&apos;s graphing tool lets you overlay multiple functions on one set of axes so you can compare, analyze, and understand relationships visually.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Block 3: How It Works */}
      <div className="flex justify-center mt-16">
        <div className="w-full max-w-5xl">
          <h2 className="text-center text-2xl sm:text-3xl font-medium dark:text-gray-200 text-foreground">
            How the Math Solver Works
          </h2>
          <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="flex flex-col items-center text-center bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-blue-500" strokeWidth={2} />
              </div>
              <h3 className="font-normal text-lg dark:text-gray-200 text-foreground mb-2">1. Enter Your Problem</h3>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm">
                Type an equation, describe a word problem in plain English, or upload a photo. Whatever is easiest for you.
              </p>
            </div>

            <div className="flex flex-col items-center text-center bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                <Calculator className="w-6 h-6 text-blue-500" strokeWidth={2} />
              </div>
              <h3 className="font-normal text-lg dark:text-gray-200 text-foreground mb-2">2. Get a Step-by-Step Solution</h3>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm">
                Our AI analyzes the problem, solves it, and returns each step with a clear explanation so you understand the &quot;why&quot;, not just the &quot;what&quot;.
              </p>
            </div>

            <div className="flex flex-col items-center text-center bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-blue-500" strokeWidth={2} />
              </div>
              <h3 className="font-normal text-lg dark:text-gray-200 text-foreground mb-2">3. Ask Follow-Ups</h3>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm">
                Didn&apos;t catch a step? Ask a follow-up question right in the chat. MathSolver remembers the context and explains further, like having a tutor on call.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Block 4: Subjects Covered */}
      <div className="flex justify-center mt-16">
        <div className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm w-full max-w-5xl rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm">
          <h2 className="text-center text-2xl sm:text-3xl font-medium dark:text-gray-200 text-foreground">
            Subjects MathSolver Can Help With
          </h2>
          <div className="flex text-gray-500 dark:text-zinc-400 flex-col gap-4 mt-5 leading-relaxed">
            <p>MathSolver covers every major math topic: arithmetic, pre-algebra, algebra I &amp; II, geometry, trigonometry, precalculus, calculus (AP AB/BC and beyond), differential equations, linear algebra, probability, and statistics. It also handles common STEM crossover questions in physics and chemistry.</p>
            <p>No matter how specific the problem is, whether it&apos;s a system of three equations, a polar-to-rectangular conversion, or a hypothesis test, MathSolver can break it down and walk you through the solution.</p>
          </div>
        </div>
      </div>

      {/* Block 5: FAQ */}
      <div className="flex justify-center mt-16">
        <div className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm w-full max-w-5xl rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm">
          <h2 className="text-center text-2xl sm:text-3xl font-medium dark:text-gray-200 text-foreground">
            Frequently Asked Questions
          </h2>
          <div className="mt-8 flex flex-col gap-12">
            
            <div className="flex flex-col gap-3">
              <h3 className="text-xl font-normal text-foreground dark:text-gray-200">What is MathSolver?</h3>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed">MathSolver is a free AI-powered math solver that delivers step-by-step solutions for algebra, calculus, geometry, trigonometry, statistics, and more. Simply type an equation or upload a photo of your math problem to get an instant, detailed breakdown.</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <h3 className="text-xl font-normal text-foreground dark:text-gray-200">Can MathSolver solve math from a photo?</h3>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed">Yes. Upload a picture of any handwritten or printed problem and MathSolver will read it, extract the equation, and return a full step-by-step solution automatically.</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <h3 className="text-xl font-normal text-foreground dark:text-gray-200">What subjects does MathSolver cover?</h3>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed">It covers arithmetic, pre-algebra, algebra, geometry, trigonometry, precalculus, calculus, linear algebra, differential equations, statistics, probability, plus physics and chemistry questions.</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <h3 className="text-xl font-normal text-foreground dark:text-gray-200">Is MathSolver completely free?</h3>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed">Yes. You can solve unlimited problems, view every step-by-step explanation, and generate practice quizzes, all at no cost, with no account required.</p>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-xl font-normal text-foreground dark:text-gray-200">How accurate is the AI math solver?</h3>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed">MathSolver uses advanced AI models trained on millions of math problems. While it handles most problems with high accuracy, we always recommend double-checking critical calculations, especially for exams or professional work.</p>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-xl font-normal text-foreground dark:text-gray-200">Does MathSolver work on mobile?</h3>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed">Absolutely. MathSolver runs in any modern browser on phones and tablets with no app install needed. The full math solver experience, including photo upload, works exactly the same on mobile.</p>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
