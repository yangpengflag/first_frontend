import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import AiLauncherSlot from "./regions/AiLauncherSlot";
import { AuthSessionProvider } from "@/lib/auth/session";
import { NavBar } from "@/components/auth/nav-bar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WanderChina — Discover China Like a Local",
  description:
    "Your AI-powered travel companion for exploring China",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${plusJakartaSans.variable} antialiased`}>
        <AuthSessionProvider>
          <NavBar />
          {children}
        </AuthSessionProvider>
        <AiLauncherSlot />
      </body>
    </html>
  );
}
