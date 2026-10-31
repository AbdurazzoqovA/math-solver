"use client";

import TurnstileProvider from "./TurnstileProvider";
import { AuthProvider } from "@/context/AuthContext";
import { BillingProvider } from "@/context/BillingContext";
import { LearningProgressProvider } from "@/context/LearningProgressContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { UIProvider } from "@/context/UIContext";
import { ChatProvider } from "@/context/ChatContext";

// Keep app state above the locale segment, which changes during navigation.
// These contexts emit no document markup; the locale layout owns html/body.
export default function AppStateProviders({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <TurnstileProvider>
        <AuthProvider>
          <BillingProvider>
            <LearningProgressProvider>
              <UIProvider><ChatProvider>{children}</ChatProvider></UIProvider>
            </LearningProgressProvider>
          </BillingProvider>
        </AuthProvider>
      </TurnstileProvider>
    </LanguageProvider>
  );
}
