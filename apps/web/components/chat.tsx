"use client";

import { FormEvent, useMemo, useState } from "react";

type Role = "assistant" | "user";

type Message = {
  id: string;
  role: Role;
  content: string;
};

const initialMessages: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "Ask me anything. I am wired to a mock response for now."
  }
];

export function Chat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(
    () => input.trim().length > 0 && !isSending,
    [input, isSending]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = input.trim();
    if (!content || isSending) {
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(({ role, content }) => ({
            role,
            content
          }))
        })
      });

      if (!response.ok) {
        throw new Error("The mock chat API returned an error.");
      }

      const data = (await response.json()) as { message: string };
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong."
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="chat">
      <div className="message-list" aria-live="polite">
        {messages.map((message) => (
          <article
            className={`message message-${message.role}`}
            key={message.id}
          >
            <span className="message-role">
              {message.role === "assistant" ? "Assistant" : "You"}
            </span>
            <p>{message.content}</p>
          </article>
        ))}
        {isSending ? (
          <article className="message message-assistant">
            <span className="message-role">Assistant</span>
            <p>Thinking...</p>
          </article>
        ) : null}
      </div>

      {error ? <p className="error-message">{error}</p> : null}

      <form className="chat-form" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="chat-input">
          Message
        </label>
        <input
          id="chat-input"
          name="message"
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type a message..."
          value={input}
        />
        <button disabled={!canSend} type="submit">
          Send
        </button>
      </form>
    </div>
  );
}
