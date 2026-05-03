import { Chat } from "@/components/chat";

export default function WidgetPage() {
  return (
    <main className="widget-shell" aria-label="Chatbot widget">
      <Chat variant="widget" />
    </main>
  );
}
