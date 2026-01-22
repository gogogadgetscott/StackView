import type { Metadata } from "next";
import "../styles/globals.css";
import { Sidebar } from "../components/sidebar";

export const metadata: Metadata = {
  title: "StackView",
  description: "Unified Docker management dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface-50 dark:bg-surface-950 text-surface-950 dark:text-surface-50 antialiased flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto relative flex flex-col">
          <div className="flex-1 flex flex-col">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}

