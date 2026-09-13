import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Source_Serif_4,
  Radio_Canada_Big,
  Geist_Mono,
} from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

/* ── Figma fonts ──────────────────────────────────────────────── */

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-source-serif",
  display: "swap",
});

const radioCanada = Radio_Canada_Big({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-radio-canada",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-geist-mono",
  display: "swap",
});

/* ── Departure Mono (kept for dashboard monospace accents) ────── */
const pixel = localFont({
  src: "./fonts/DepartureMono-Regular.woff2",
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Privent — Policy-bounded AI treasury",
  description:
    "Bounded financial authority for autonomous agents. The AI proposes. Policy decides. An isolated signer executes.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${sourceSerif.variable} ${radioCanada.variable} ${geistMono.variable} ${pixel.variable} antialiased`}
        style={{ margin: 0 }}
      >
        {children}
      </body>
    </html>
  );
}
