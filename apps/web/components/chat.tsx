"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import ReactMarkdown from "react-markdown";

type Role = "assistant" | "user";

type Message = {
  id: string;
  role: Role;
  content: string;
};

type StoredDocument = {
  id: string;
  name: string;
  createdAt: string;
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
  const [isUploading, setIsUploading] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(
    () => input.trim().length > 0 && !isSending,
    [input, isSending]
  );

  const loadDocuments = useCallback(async () => {
    try {
      const response = await fetch("/api/documents");
      if (!response.ok) {
        return;
      }

      const body = (await response.json()) as {
        documents?: StoredDocument[];
      };
      setDocuments(body.documents ?? []);
    } catch {
      setDocuments([]);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let ignore = false;

    fetch("/api/documents")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { documents?: StoredDocument[] } | null) => {
        if (!ignore) {
          setDocuments(body?.documents ?? []);
        }
      })
      .catch(() => {
        if (!ignore) {
          setDocuments([]);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  async function handleDocumentUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const file = fileInputRef.current?.files?.[0];
    setUploadStatus(null);

    if (!file) {
      setUploadStatus("Choose a .txt file to upload.");
      return;
    }

    if (file.type !== "text/plain" && !file.name.toLowerCase().endsWith(".txt")) {
      setUploadStatus("Only .txt files are supported.");
      return;
    }

    setIsUploading(true);

    try {
      const text = await file.text();
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: file.name,
          text
        })
      });

      if (!response.ok) {
        throw new Error("Document upload failed.");
      }

      setUploadStatus(`Uploaded ${file.name}.`);
      await loadDocuments();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (caughtError) {
      setUploadStatus(
        caughtError instanceof Error
          ? caughtError.message
          : "Document upload failed."
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDocumentDelete(document: StoredDocument) {
    setUploadStatus(null);
    setDeletingDocumentId(document.id);

    try {
      const response = await fetch(
        `/api/documents?id=${encodeURIComponent(document.id)}`,
        {
          method: "DELETE"
        }
      );

      if (!response.ok) {
        throw new Error("Document delete failed.");
      }

      setUploadStatus(`Deleted ${document.name}.`);
      await loadDocuments();
    } catch (caughtError) {
      setUploadStatus(
        caughtError instanceof Error
          ? caughtError.message
          : "Document delete failed."
      );
    } finally {
      setDeletingDocumentId(null);
    }
  }

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
      <section className="admin-section" aria-label="Admin knowledge base">
        <div className="section-heading">
          <p className="section-kicker">Admin</p>
          <h2>Knowledge Base</h2>
        </div>

        <form className="document-upload" onSubmit={handleDocumentUpload}>
          <label htmlFor="document-input">Document</label>
          <input
            accept=".txt,text/plain"
            disabled={isUploading}
            id="document-input"
            name="document"
            ref={fileInputRef}
            type="file"
          />
          <button disabled={isUploading} type="submit">
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </form>

        {uploadStatus ? <p className="upload-message">{uploadStatus}</p> : null}

        <div className="document-list" aria-label="Uploaded documents">
          <p>Documents</p>
          {documents.length > 0 ? (
            <ul>
              {documents.map((document) => (
                <li key={document.id}>
                  <span>{document.name}</span>
                  <button
                    disabled={deletingDocumentId === document.id}
                    onClick={() => void handleDocumentDelete(document)}
                    type="button"
                  >
                    {deletingDocumentId === document.id
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <span>No documents uploaded.</span>
          )}
        </div>
      </section>

      <section className="public-section" aria-label="Public chatbot">
        <div className="section-heading">
          <p className="section-kicker">Public</p>
          <h2>Chatbot</h2>
        </div>

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
      </section>
    </div>
  );
}
