import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import InstitutionalBrandBadge from "./components/InstitutionalBrandBadge";
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
  title: "Coforma Institucional",
  description:
    "Demo institucional de fiscalización, trazabilidad y control operativo de formación para el empleo.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <InstitutionalBrandBadge />
        {children}
      </body>
    </html>
  );
}