import { Chat } from "@/components/chat";

export default function Home() {
  return (
    <main className="app-shell">
      <section className="chat-panel" aria-label="AI assistant chat">
        <header className="chat-header">
          <div>
            <p className="eyebrow">Local AI Assistant</p>
            <h1>Chat</h1>
          </div>
          <span className="status-pill">OpenAI</span>
        </header>
        <Chat />
      </section>
    </main>
  );
}
