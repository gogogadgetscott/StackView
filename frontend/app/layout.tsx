import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "StackView",
  description: "Unified Docker management dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-950 text-neutral-50 antialiased">{children}</body>
    </html>
  );
}
