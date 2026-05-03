import Link from "next/link";
import { Admin } from "@/components/admin";

export default function AdminPage() {
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";

  return (
    <main className="app-shell">
      <section className="chat-panel admin-panel" aria-label="Admin">
        <header className="chat-header">
          <div>
            <p className="eyebrow">Local AI Assistant</p>
            <h1>Admin</h1>
          </div>
          <nav className="top-nav" aria-label="Primary">
            <Link href="/">Chat</Link>
          </nav>
        </header>
        <div className="chat">
          <Admin supabaseAnonKey={supabaseAnonKey} supabaseUrl={supabaseUrl} />
        </div>
      </section>
    </main>
  );
}
