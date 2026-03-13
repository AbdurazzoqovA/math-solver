import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MathSolver - Your Personal AI Math Assistant",
  description: "Get instant step-by-step solutions to your math problems with our AI Math Solver.",
};

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-primary-300 selection:text-foreground`}>
        {/* Atmospheric Background */}
        <div className="fixed inset-0 bg-[#fafafa] dark:bg-[#0a0a0a] -z-10" />
        <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-400/10 blur-[120px] pointer-events-none -z-10" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary-600/10 blur-[120px] pointer-events-none -z-10" />

        <div className="flex h-screen overflow-hidden relative">
          <Sidebar />
          <div className="flex flex-col flex-1 overflow-hidden relative">
            <Header />
            <main className="flex-1 overflow-y-auto relative z-0 h-full">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
