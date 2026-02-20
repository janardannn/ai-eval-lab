import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { UserNav } from "@/components/UserNav";
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
  title: "ai-eval-lab",
  description: "AI-proctored practical exams for engineering tools",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="h-14 border-b border-foreground/10 flex items-center justify-between px-6">
          <a href="/" className="text-sm font-semibold">
            ai-eval-lab
          </a>
          <UserNav />
        </header>
        {children}
      </body>
    </html>
  );
}
