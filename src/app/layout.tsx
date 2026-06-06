import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI IELTS Writing Scorer",
  description:
    "Submit IELTS Writing Task 1 or Task 2 and receive AI-powered band scoring, detailed feedback, error correction and improvement plans.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
