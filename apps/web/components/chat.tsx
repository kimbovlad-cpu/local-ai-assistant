"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

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
    content: "Ask me anything."
  }
];

export function Chat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(
    () => input.trim().length > 0 && !isSending,
    [input, isSending]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      const requestMessages = [...messages, userMessage].map(
        ({ role, content }) => ({
          role,
          content
        })
      );

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: requestMessages
        })
      });

      if (!response.ok) {
        throw new Error("The chat API returned an error.");
      }

      if (!response.body) {
        throw new Error("The chat API did not return a response stream.");
      }

      const assistantId = crypto.randomUUID();
      setMessages((current) => [
        ...current,
        { id: assistantId, role: "assistant", content: "" }
      ]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((current) =>
          current.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: msg.content + chunk }
              : msg
          )
        );
      }

      const remainingText = decoder.decode();
      if (remainingText) {
        setMessages((current) =>
          current.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: msg.content + remainingText }
              : msg
          )
        );
      }
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
            {message.role === "assistant" ? (
              <ReactMarkdown>{message.content}</ReactMarkdown>
            ) : (
              <p>{message.content}</p>
            )}
          </article>
        ))}
        <div ref={bottomRef} />
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
