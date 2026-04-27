import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guess Your Friendsssssss",
  description: "The party game where you guess what your friends said",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-slate-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
