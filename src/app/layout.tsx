import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Veritus", template: "%s | Veritus" },
  description: "Your Personal Life Operating System",
  keywords: ["productivity", "life os", "tasks", "habits", "finance"],
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#16162a",
              color: "#e2e8f0",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "10px",
              fontSize: "14px",
            },
            success: {
              iconTheme: { primary: "#00ff88", secondary: "#16162a" },
            },
            error: { iconTheme: { primary: "#f87171", secondary: "#16162a" } },
          }}
        />
      </body>
    </html>
  );
}
