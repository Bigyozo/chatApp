import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navibar from "../components/Navibar";
import Providers from "../components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chat App",
  description: "A Chat App using AI SDK and Next.js created by Bigyozo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col h-screen`}
      >
        <Providers>
          <header className="bg-green-200 px-6 py-3 flex items-center shadow-sm shrink-0">
            <h1 className="text-xl font-semibold text-blue-800">チャットボット</h1>
          </header>
          <div className="flex flex-row flex-1 overflow-hidden">
            <div className="w-1/5 bg-gray-100 overflow-y-auto">
              <Navibar />
            </div>
            <div className="w-4/5 overflow-hidden">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
