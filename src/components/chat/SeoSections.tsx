import { Calculator, Video, BookOpen, LineChart } from "lucide-react";

export default function SeoSections() {
  return (
    <div className="w-full px-4 relative z-10 mt-8 mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
      
      {/* Block 1: Intro */}
      <div className="flex justify-center">
        <div className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm w-full max-w-5xl rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm">
          <h2 className="text-center text-2xl sm:text-3xl font-medium dark:text-gray-200 text-foreground">
            MathSolver Math Solver and AI Calculator
          </h2>
          <div className="flex text-gray-500 dark:text-zinc-400 flex-col gap-4 mt-5 leading-relaxed">
            <p>MathSolver is your all-in-one math solver and AI tutor, serving as an AI math calculator that solves algebra, calculus, chemistry, and physics problems, making it the ultimate homework helper and AI math solver.</p>
            <p>MathSolver is the first to provide on-demand, AI-powered video explanations with engaging animations and diagrams for any homework question, making it the most interactive homework helper and math solver. Our problem-solving tools engage students from elementary school, high school, and college.</p>
            <p>Our advanced AI math technology has served millions of unique students worldwide. Gain confidence in your math-solving skills through on-demand step-by-step solutions, video explanations, and graphs that simplify the most complex math and STEM problems. With MathSolver as your AI math homework helper, you'll not only receive accurate solutions but also gain a deeper understanding of difficult concepts.</p>
          </div>
        </div>
      </div>

      {/* Block 2: Advanced Tools */}
      <div className="flex justify-center mt-16">
        <div className="w-full max-w-5xl">
          <h2 className="text-center text-2xl sm:text-3xl font-medium dark:text-gray-200 text-foreground">
            Advanced AI Powered Math Tools
          </h2>
          <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="gap-2 flex flex-col bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm hover:-translate-y-1 transition-transform">
              <div className="flex flex-row gap-2 justify-center items-center flex-wrap">
                <Calculator className="w-[30px] h-[30px] text-blue-500" strokeWidth={2} />
                <h3 className="font-normal text-xl text-center dark:text-gray-200 text-foreground">Step-by-step Solutions</h3>
              </div>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm lg:text-base mt-2">
                Break down complex problems into clear, digestible steps with MathSolver's step-by-step solutions. MathSolver's math solving technology walks you through the problem from start to finish, explaining key concepts and calculations along the way. Unlike a basic math calculator, MathSolver functions as your personal math tutor and math solver, providing explanations that are easy to understand at any skill level. Whether you're tackling basic algebra, geometry, or advanced calculus, our detailed solutions help you grasp the underlying concepts, not just arrive at the final answer.
              </p>
            </div>

            <div className="gap-2 flex flex-col bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm hover:-translate-y-1 transition-transform">
              <div className="flex flex-row gap-2 justify-center items-center flex-wrap">
                <Video className="w-[30px] h-[30px] text-blue-500" strokeWidth={2} />
                <h3 className="font-normal text-xl text-center dark:text-gray-200 text-foreground">AI Video Explanations</h3>
              </div>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm lg:text-base mt-2">
                Take homework help to the next level with MathSolver's cutting-edge AI math solving technology that creates custom educational videos for your question. Video explanations include engaging diagrams, animations, and a comprehensive voiceover. Unlike any other math solver, MathSolver videos can understand diagrams and steps from your problem and bring them to life in video form.
              </p>
            </div>

            <div className="gap-2 flex flex-col bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm hover:-translate-y-1 transition-transform">
              <div className="flex flex-row gap-2 justify-center items-center flex-wrap">
                <BookOpen className="w-[30px] h-[30px] text-blue-500" strokeWidth={2} />
                <h3 className="font-normal text-xl text-center dark:text-gray-200 text-foreground">Custom Interactive Quizzes</h3>
              </div>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm lg:text-base mt-2">
                Test your understanding through creating interactive practice questions with MathSolver. Create quizzes for any topic - algebra, calculus, physics, chemistry, statistics, the possibilities are endless. Whether you're preparing for an exam or reinforcing concepts, MathSolver's personalized quizzes adapt to your learning pace and provide targeted practice where you need it most.
              </p>
            </div>

            <div className="gap-2 flex flex-col bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm hover:-translate-y-1 transition-transform">
              <div className="flex flex-row gap-2 items-center justify-center flex-wrap">
                <LineChart className="w-[30px] h-[30px] text-blue-500" strokeWidth={2} />
                <h3 className="font-normal text-xl text-center dark:text-gray-200 text-foreground">MathSolver Graphing Software</h3>
              </div>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed text-sm lg:text-base mt-2">
                Visualize complex algebraic and geometric relationships instantly using MathSolver's robust graphing software. Enter multiple equations to discover intercepts, map out functions, and explore behavior dynamically. MathSolver allows you to visually break down and interact with problems that are exceedingly difficult to process linearly.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Block 3: Personalized Tutor */}
      <div className="flex justify-center mt-16">
        <div className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm w-full max-w-5xl rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm">
          <h2 className="text-center text-2xl sm:text-3xl font-medium dark:text-gray-200 text-foreground">
            Your Own Personalized Tutor
          </h2>
          <div className="flex text-gray-500 dark:text-zinc-400 flex-col gap-4 mt-5 leading-relaxed">
            <p>Upload homework in any format - text, photos, or PDFs - and get instant explanations from a 24/7 AI math tutor. MathSolver's AI technology understands your questions and adapts to your learning style. Ask follow-up questions at any point in your conversation, dive deeper into specific concepts, and create interactive quizzes to test your understanding.</p>
          </div>
        </div>
      </div>

      {/* Block 4: Built by Students */}
      <div className="flex justify-center mt-16">
        <div className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-sm w-full max-w-5xl rounded-xl p-6 border border-black/5 dark:border-white/5 shadow-sm">
          <h2 className="text-center text-2xl sm:text-3xl font-medium dark:text-gray-200 text-foreground">
            MathSolver AI Math Solver - Built by Students, for Students
          </h2>
          <div className="flex text-gray-500 dark:text-zinc-400 flex-col gap-4 mt-5 leading-relaxed">
            <p>MathSolver was created by software engineers who personally experienced the challenges of learning complex math concepts. Our mission is to create an AI math solver that empowers students to learn more effectively and efficiently through innovative AI-powered tools. With features like step-by-step explanations, personalized AI videos, and interactive quizzes, MathSolver helps make learning math easier and more engaging. Join a global community of students and boost your confidence in mastering tricky math and STEM topics.</p>
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
              <h3 className="text-xl font-normal text-foreground dark:text-gray-200">What kind of math solver is MathSolver?</h3>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed">It’s a Math Solver that uses AI to provide accurate step-by-step solutions. It is also a homework helper and walks students through difficult topics.</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <h3 className="text-xl font-normal text-foreground dark:text-gray-200">Can MathSolver solve math problems with just a photo?</h3>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed">Yes, MathSolver is an Math Solver App and Site that will solve math problems simply by dragging and dropping photos into the Ai Calculator</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <h3 className="text-xl font-normal text-foreground dark:text-gray-200">What types of problems can MathSolver solve?</h3>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed">MathSolver can solve various types of mathematics problems including algebra, calculus, statistics, geometry, and word problems. MathSolver can also solve problems relating to physics, accounting, and chemistry.</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <h3 className="text-xl font-normal text-foreground dark:text-gray-200">Can I use MathSolver on a mobile device?</h3>
              <p className="text-gray-500 dark:text-zinc-400 leading-relaxed">Yes, MathSolver works beautifully on mobile web browsers, providing you with a 24/7 math solver just from your pocket!</p>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
