"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import ReactMarkdown from "react-markdown";
import { branding } from "@/lib/branding";

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
    content: branding.welcomeMessage
  }
];

type ChatProps = {
  variant?: "default" | "widget";
};

export function Chat({ variant = "default" }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(
    () => input.trim().length > 0 && !isSending,
    [input, isSending]
  );
  const suggestedQuestions = "suggestedQuestions" in branding
    ? branding.suggestedQuestions
    : [];
  const isWidget = variant === "widget";
  const visibleMessages = isWidget
    ? messages.filter((message) => message.id !== "welcome")
    : messages;

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
    <div className={`chat ${isWidget ? "widget-chat" : ""}`}>
      <section className="public-section" aria-label="Public chatbot">
        {isWidget ? (
          <header className="widget-header">
            <div className="widget-avatar" aria-hidden="true">
              {branding.assistantName.slice(0, 1)}
            </div>
            <div>
              <p className="widget-kicker">{branding.chatTitle}</p>
              <h1>{branding.assistantName}</h1>
              <span className="widget-status">
                <span aria-hidden="true" />
                Online
              </span>
            </div>
          </header>
        ) : (
          <div className="section-heading">
            <p className="section-kicker">Public</p>
            <h2>{branding.chatTitle}</h2>
          </div>
        )}

        <div className="message-list" aria-live="polite">
          {isWidget ? (
            <div className="widget-welcome" aria-label="Suggested questions">
              <p>{branding.welcomeMessage}</p>
              {suggestedQuestions.length > 0 ? (
                <div className="suggested-question-list">
                  {suggestedQuestions.map((question) => (
                    <button
                      key={question}
                      onClick={() => setInput(question)}
                      type="button"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {visibleMessages.map((message) => (
            <article
              className={`message message-${message.role}`}
              key={message.id}
            >
              <span className="message-role">
                {message.role === "assistant" ? branding.assistantName : "You"}
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
            placeholder={branding.inputPlaceholder}
            value={input}
          />
          <button disabled={!canSend} type="submit">
            Send
          </button>
        </form>
      </section>
    </div>
  );
}
