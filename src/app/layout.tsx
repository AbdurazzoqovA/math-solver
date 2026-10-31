import AppStateProviders from "@/components/providers/AppStateProviders";
import "./globals.css";
import "katex/dist/katex.min.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <AppStateProviders>{children}</AppStateProviders>;
}
