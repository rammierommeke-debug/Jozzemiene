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
      <body className="min-h-screen flex relative overflow-x-clip">
        <SessionProvider>
          <ThemeProvider>
            <Sidebar />
            <VervenPanel />
            <main className="relative z-10 flex-1 md:ml-72 p-3 md:p-5 lg:p-6 min-h-screen pb-24 md:pb-6">
              <div className="page-frame min-h-[calc(100vh-1.5rem)] rounded-[1.8rem] px-2 py-2 md:min-h-[calc(100vh-2.5rem)] md:rounded-[2.25rem] md:px-3 md:py-3">
                {children}
              </div>
            </main>
            <AskClaudeButton />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
