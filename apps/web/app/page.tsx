import { Chat } from "@/components/chat";

export default function Home() {
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";

  return (
    <main className="app-shell">
      <section className="chat-panel" aria-label="AI assistant chat">
        <header className="chat-header">
          <div>
            <p className="eyebrow">Local AI Assistant</p>
            <h1>Assistant</h1>
          </div>
          <span className="status-pill">RAG</span>
        </header>
        <Chat supabaseAnonKey={supabaseAnonKey} supabaseUrl={supabaseUrl} />
      </section>
    </main>
  );
}
