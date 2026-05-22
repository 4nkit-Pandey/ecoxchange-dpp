import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EcoXchange — Digital Product Passport Infrastructure",
    template: "%s | EcoXchange",
  },
  description:
    "The digital identity infrastructure for physical products. Every product, a persistent passport. Every transaction, verified.",
  keywords: [
    "digital product passport",
    "DPP",
    "circular economy",
    "product lifecycle",
    "campus marketplace",
    "verified resale",
    "QR code products",
  ],
  authors: [{ name: "EcoXchange" }],
  creator: "EcoXchange",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: process.env.NEXT_PUBLIC_APP_URL,
    title: "EcoXchange — Digital Product Passport Infrastructure",
    description:
      "The operating system for trusted physical assets. Scan. Activate. Trust.",
    siteName: "EcoXchange",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-[#080808] text-white`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
