import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-mono",
});

const pixel = localFont({
  src: "./fonts/DepartureMono-Regular.woff2",
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Privent",
  description:
    "Bounded financial authority for autonomous agents. The AI proposes. Policy decides. An isolated signer executes.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable} ${pixel.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
