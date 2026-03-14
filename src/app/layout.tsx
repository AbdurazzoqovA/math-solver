import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Math Solver - Free AI Math Solver with Step-by-Step Solutions | MathSolver",
  description: "Solve any math problem instantly with MathSolver, the free AI math solver. Get step-by-step solutions for algebra, calculus, geometry, and more. Upload a photo or type your equation.",
  openGraph: {
    title: "Math Solver - Free AI Math Solver with Step-by-Step Solutions",
    description: "Solve any math problem instantly with MathSolver, the free AI math solver. Get step-by-step solutions for algebra, calculus, geometry, and more.",
    images: ["/math-solver-og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Math Solver - Free AI Math Solver with Step-by-Step Solutions",
    description: "Solve any math problem instantly with MathSolver, the free AI math solver. Get step-by-step solutions for algebra, calculus, geometry, and more.",
    images: ["/math-solver-og.png"],
  },
};

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { UIProvider } from "@/context/UIContext";
import { ChatProvider } from "@/context/ChatContext";
import DraggableCalculator from "@/components/chat/DraggableCalculator";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import SplitLayoutWrapper from "@/components/layout/SplitLayoutWrapper";
import Script from "next/script";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-YG1NPYM8BS"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-YG1NPYM8BS');
          `}
        </Script>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-primary-300 selection:text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <UIProvider>
            <ChatProvider>
            {/* Global Tools */}
            <DraggableCalculator />

            {/* Atmospheric Background */}
            <div className="fixed inset-0 bg-[#fafafa] dark:bg-[#0a0a0a] -z-10" />
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-400/10 blur-[120px] pointer-events-none -z-10" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary-600/10 blur-[120px] pointer-events-none -z-10" />

            <div className="flex h-screen overflow-hidden relative">
              <Sidebar />
              <div className="flex flex-col flex-1 overflow-hidden relative">
                {/* Mobile header with hamburger */}
                <div className="md:hidden">
                  <Header />
                </div>
                <SplitLayoutWrapper>
                  <div className="flex-1 flex flex-col h-full w-full relative">
                    <main className="flex-1 overflow-y-auto relative z-0 h-full w-full">
                      {children}
                    </main>
                  </div>
                </SplitLayoutWrapper>
              </div>
            </div>
          </ChatProvider>
        </UIProvider>
      </ThemeProvider>
      </body>
    </html>
  );
}
