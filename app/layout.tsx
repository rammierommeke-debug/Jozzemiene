import type { Metadata } from "next";
import { Playfair_Display, Lato, Caveat } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import VervenPanel from "@/components/VervenPanel";
import AskClaudeButton from "@/components/AskClaudeButton";
import SpotifyMiniPlayer from "@/components/SpotifyMiniPlayer";
import { ThemeProvider } from "@/lib/themeContext";
import { SpotifyProvider } from "@/lib/spotifyContext";
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
      <body className="bg-cream min-h-screen flex">
        <SessionProvider>
          <ThemeProvider>
            <SpotifyProvider>
              <Sidebar />
              <VervenPanel />
              <main className="flex-1 md:ml-64 p-4 md:p-8 min-h-screen pb-24 md:pb-8">
                {children}
              </main>
              <AskClaudeButton />
              <SpotifyMiniPlayer />
            </SpotifyProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
