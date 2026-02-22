import type { Metadata } from "next";
import { Space_Grotesk, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { UserNav } from "@/components/UserNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ai-eval-lab",
  description: "AI-proctored practical assessments for engineering tools",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <header className="h-[64px] sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border text-[16px]">
            <div className="max-w-6xl mx-auto h-full flex items-center justify-between px-6">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-lg font-bold tracking-tight">
                ai-eval-lab
              </Link>
              <nav className="hidden sm:flex items-center gap-6">
                <Link
                  href="/lab/kicad"
                  className="text-[15px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Assessments
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <UserNav />
            </div>
            </div>
          </header>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
