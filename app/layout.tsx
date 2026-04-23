import type { Metadata } from "next";
import { Playfair_Display, Lato, Caveat } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import VervenPanel from "@/components/VervenPanel";
import AskClaudeButton from "@/components/AskClaudeButton";
import { ThemeProvider } from "@/lib/themeContext";
import SessionProvider from "@/components/SessionProvider";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-body",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-handwriting",
});

export const metadata: Metadata = {
  title: "Jozzemiene",
  description: "Een plekje voor ons twee",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${lato.variable} ${caveat.variable}`}>
      <body className="min-h-screen flex relative overflow-x-hidden">
        <SessionProvider>
          <ThemeProvider>
            <Sidebar />
            <VervenPanel />
            <main className="relative z-10 flex-1 md:ml-64 px-4 pt-20 pb-28 md:p-6 md:pb-8 lg:p-8 min-h-screen">
              {children}
            </main>
            <AskClaudeButton />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
