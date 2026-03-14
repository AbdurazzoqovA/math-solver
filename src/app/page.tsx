import type { Metadata } from 'next';
import ChatArea from "@/components/chat/ChatArea";

export const metadata: Metadata = {
  title: "Math Solver - Free AI Math Solver with Step-by-Step Solutions | MathSolver",
  description: "Solve any math problem instantly with MathSolver, the free AI math solver. Get step-by-Step solutions for algebra, calculus, geometry, and more. Upload a photo or type your equation.",
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return (
    <div className="w-full h-full bg-background relative flex items-center justify-center">
      <ChatArea />
    </div>
  );
}
