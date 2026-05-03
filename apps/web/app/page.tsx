import { Chat } from "@/components/chat";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { branding } from "@/lib/branding";

export const metadata: Metadata = {
  title: `${branding.assistantName} | ${branding.companyName}`
};

export default function Home() {
  const brandStyle = {
    "--accent": branding.accentColor
  } as CSSProperties;

  return (
    <main className="app-shell" style={brandStyle}>
      <section className="chat-panel" aria-label="AI assistant chat">
        <header className="chat-header">
          <div>
            <p className="eyebrow">{branding.companyName}</p>
            <h1>{branding.assistantName}</h1>
          </div>
          <nav className="top-nav" aria-label="Primary">
            <span className="status-pill">RAG</span>
            <Link href="/admin">Admin</Link>
          </nav>
        </header>
        <Chat />
      </section>
    </main>
  );
}
