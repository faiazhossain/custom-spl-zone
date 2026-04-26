import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SPL Custom Zone - Saudi Arabia",
  description: "Draw and manage custom polygon zones on the SPL map",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang='en'
      className={`${outfit.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className='min-h-full flex flex-col font-sans'>
        {children}
        <Toaster
          position='top-center'
          toastOptions={{
            style: {
              background: "var(--card)",
              color: "var(--card-foreground)",
              border: "1px solid var(--border)",
            },
          }}
        />
      </body>
    </html>
  );
}
