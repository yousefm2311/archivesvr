import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { UserBar } from "./user-bar";

const geistSans = localFont({
  src: [
    {
      path: "../public/Geist-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/Geist-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = localFont({
  src: [
    {
      path: "../public/GeistMono-Regular.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-geist-mono",
  display: "swap",
});


export const metadata: Metadata = {
  title: "Clients System",
  description: "Next.js migration for legacy clients system",
  manifest: "/manifest.json",
  icons: {
  icon: "/icon-192.png",
},
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" data-theme="light">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
        style={{ background: "var(--background)", color: "var(--foreground)" }}
        suppressHydrationWarning
      >
        <UserBar />
        {children}
      </body>
    </html>
  );
}
