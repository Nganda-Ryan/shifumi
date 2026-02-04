import type { Metadata } from "next";
import { Passero_One } from "next/font/google"
import "./globals.css";
import { GameProviderWrapper } from "@/components/GameProviderWrapper";

const passeroone = Passero_One({weight: '400', subsets: ["latin"]})

export const metadata: Metadata = {
  title: "Shi-Fu-Mi | Rock Paper Scissors Online",
  description: "Play Rock Paper Scissors online with friends in real-time",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${passeroone.className}`}>
        <div className="background-blur"></div>
        <div className="layout-content">
          <GameProviderWrapper>
            {children}
          </GameProviderWrapper>
        </div>
      </body>
    </html>
  );
}
