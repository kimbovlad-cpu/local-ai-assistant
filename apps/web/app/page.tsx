import { Chat } from "@/components/chat";
import Link from "next/link";

export default function Home() {
  return (
    <main className="app-shell">
      <section className="chat-panel" aria-label="AI assistant chat">
        <header className="chat-header">
          <div>
            <p className="eyebrow">Local AI Assistant</p>
            <h1>Assistant</h1>
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
