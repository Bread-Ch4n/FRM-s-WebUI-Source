import type { Metadata } from "next";
import "./css/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Navigation from "@/components/navigation";
import React from "react";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-custom-font",
});

export const metadata: Metadata = {
  title: "Ficsit Remote Monitoring",
  description: "Monitor your factory remotely!",
  icons: "/favicon.avif",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.className}>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Navigation />
          <div className={"mt-20"}>{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
