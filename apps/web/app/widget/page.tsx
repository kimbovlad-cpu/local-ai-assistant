import { Chat } from "@/components/chat";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { branding } from "@/lib/branding";

export const metadata: Metadata = {
  title: `${branding.chatTitle} | ${branding.companyName}`
};

type WidgetPageProps = {
  searchParams?: Promise<{
    company?: string | string[];
  }>;
};

export default async function WidgetPage({ searchParams }: WidgetPageProps) {
  const params = await searchParams;
  const companyParam = params?.company;
  const companySlug = Array.isArray(companyParam)
    ? companyParam[0]
    : companyParam;
  const brandStyle = {
    "--accent": branding.accentColor
  } as CSSProperties;

  return (
    <main className="widget-shell" aria-label="Chatbot widget" style={brandStyle}>
      <Chat companySlug={companySlug} variant="widget" />
    </main>
  );
}
