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
import { createClient, type Session } from "@supabase/supabase-js";

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

type ChatProps = {
  supabaseAnonKey: string;
  supabaseUrl: string;
};

const initialMessages: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "Ask me anything."
  }
];

export function Chat({ supabaseAnonKey, supabaseUrl }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return null;
    }

    return createClient(supabaseUrl, supabaseAnonKey);
  }, [supabaseAnonKey, supabaseUrl]);

  const canSend = useMemo(
    () => input.trim().length > 0 && !isSending,
    [input, isSending]
  );

  const loadDocuments = useCallback(async () => {
    const accessToken = session?.access_token;
    if (!accessToken) {
      setDocuments([]);
      return;
    }

    try {
      const response = await fetch("/api/documents", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
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
  }, [session?.access_token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let ignore = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!ignore) {
        setSession(data.session);
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (!currentSession) {
        setDocuments([]);
      }
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const accessToken = session?.access_token;
    if (!accessToken) {
      return;
    }

    let ignore = false;

    fetch("/api/documents", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })
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
  }, [session?.access_token]);

  async function handleAdminLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setAuthStatus("Supabase is not configured.");
      return;
    }

    setIsSigningIn(true);
    setAuthStatus(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (signInError) {
        throw signInError;
      }

      setPassword("");
      setAuthStatus("Logged in.");
    } catch (caughtError) {
      setAuthStatus(
        caughtError instanceof Error ? caughtError.message : "Login failed."
      );
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleAdminLogout() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setDocuments([]);
    setUploadStatus(null);
    setAuthStatus("Logged out.");
  }

  async function handleDocumentUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const accessToken = session?.access_token;
    if (!accessToken) {
      setUploadStatus("Admin login is required.");
      return;
    }

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
          Authorization: `Bearer ${accessToken}`,
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
    const accessToken = session?.access_token;
    if (!accessToken) {
      setUploadStatus("Admin login is required.");
      return;
    }

    setUploadStatus(null);
    setDeletingDocumentId(document.id);

    try {
      const response = await fetch(
        `/api/documents?id=${encodeURIComponent(document.id)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
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
      {session ? (
        <section className="admin-section" aria-label="Admin knowledge base">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Admin</p>
              <h2>Knowledge Base</h2>
            </div>
            <button
              className="logout-button"
              onClick={() => void handleAdminLogout()}
              type="button"
            >
              Logout
            </button>
          </div>

          <p className="admin-user">{session.user.email}</p>

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

          {uploadStatus ? (
            <p className="upload-message">{uploadStatus}</p>
          ) : null}

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
      ) : (
        <section className="admin-login-section" aria-label="Admin login">
          <div className="section-heading">
            <p className="section-kicker">Admin</p>
            <h2>Login</h2>
          </div>

          <form className="admin-login-form" onSubmit={handleAdminLogin}>
            <label htmlFor="admin-email">Email</label>
            <input
              autoComplete="email"
              id="admin-email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
            <label htmlFor="admin-password">Password</label>
            <input
              autoComplete="current-password"
              id="admin-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
            <button disabled={isSigningIn} type="submit">
              {isSigningIn ? "Logging in..." : "Login"}
            </button>
          </form>

          {authStatus ? <p className="auth-message">{authStatus}</p> : null}
        </section>
      )}

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
