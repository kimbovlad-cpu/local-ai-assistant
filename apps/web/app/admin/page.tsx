import Link from "next/link";
import { Admin } from "@/components/admin";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { branding } from "@/lib/branding";

export const metadata: Metadata = {
  title: `${branding.adminTitle} | ${branding.companyName}`
};

export default function AdminPage() {
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";
  const brandStyle = {
    "--accent": branding.accentColor
  } as CSSProperties;

  return (
    <main className="app-shell" style={brandStyle}>
      <section className="chat-panel admin-panel" aria-label="Admin">
        <header className="chat-header">
          <div>
            <p className="eyebrow">{branding.companyName}</p>
            <h1>{branding.adminTitle}</h1>
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
