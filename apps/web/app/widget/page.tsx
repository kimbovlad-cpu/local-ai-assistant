import { Chat } from "@/components/chat";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { branding } from "@/lib/branding";

export const metadata: Metadata = {
  title: `${branding.chatTitle} | ${branding.companyName}`
};

export default function WidgetPage() {
  const brandStyle = {
    "--accent": branding.accentColor
  } as CSSProperties;

  return (
    <main className="widget-shell" aria-label="Chatbot widget" style={brandStyle}>
      <Chat variant="widget" />
    </main>
  );
}
