import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLanguage, isLocale } from "@/lib/i18n/locales";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://math-solver.io"),
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
import DraggableCalculator from "@/components/chat/DraggableCalculator";
import UsageLimitToast from "@/components/billing/UsageLimitToast";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import SplitLayoutWrapper from "@/components/layout/SplitLayoutWrapper";
import Script from "next/script";

export default async function RootLayout({
  children, params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const direction = getLanguage(locale).dir;
  const websiteStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://math-solver.io/#website",
        url: "https://math-solver.io",
        name: "MathSolver",
        description:
          "Free math solver with step-by-step solutions and practice questions.",
        publisher: { "@id": "https://math-solver.io/#organization" },
      },
      {
        "@type": "Organization",
        "@id": "https://math-solver.io/#organization",
        name: "MathSolver",
        url: "https://math-solver.io",
        logo: {
          "@type": "ImageObject",
          url: "https://math-solver.io/icons8-math-80.png",
          width: 80,
          height: 80,
        },
      },
    ],
  };

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <head>
        <Script
          id="website-structured-data"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteStructuredData).replace(
              /</g,
              "\\u003c",
            ),
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-primary-300 selection:text-foreground`}>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-YG1NPYM8BS"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', 'G-YG1NPYM8BS', { anonymize_ip: true });
          `}
        </Script>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          
          
            
              
                
                  
                  {/* Global Tools */}
                  <DraggableCalculator />
                  <UsageLimitToast />

                  {/* Atmospheric Background */}
                  <div className="fixed inset-0 bg-[#fafafa] dark:bg-[#0a0a0a] -z-10" />
                  <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-400/10 blur-[120px] pointer-events-none -z-10" />
                  <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary-600/10 blur-[120px] pointer-events-none -z-10" />

                  <div dir="ltr" className="flex h-[100dvh] overflow-hidden relative">
                    <Sidebar />
                    <div className="flex flex-col flex-1 overflow-hidden relative">
                      {/* Mobile header with hamburger */}
                      <div className="md:hidden">
                        <Header />
                      </div>
                      <SplitLayoutWrapper>
                        <div className="flex-1 flex flex-col h-full w-full relative">
                          <main lang={locale} dir={direction} className="flex-1 overflow-y-auto relative z-0 h-full w-full">
                            {children}
                          </main>
                        </div>
                      </SplitLayoutWrapper>
                    </div>
                  </div>
                  
                
              
            
          
          
        </ThemeProvider>
      </body>
    </html>
  );
}
