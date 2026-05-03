"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { createClient, type Session } from "@supabase/supabase-js";

type StoredDocument = {
  id: string;
  name: string;
  createdAt: string;
};

type AdminProps = {
  supabaseAnonKey: string;
  supabaseUrl: string;
};

async function fetchDocuments(accessToken: string) {
  const response = await fetch("/api/documents", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!response.ok) {
    return [];
  }

  const body = (await response.json()) as {
    documents?: StoredDocument[];
  };
  return body.documents ?? [];
}

export function Admin({ supabaseAnonKey, supabaseUrl }: AdminProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(
    null
  );
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return null;
    }

    return createClient(supabaseUrl, supabaseAnonKey);
  }, [supabaseAnonKey, supabaseUrl]);

  async function refreshDocuments() {
    const accessToken = session?.access_token;
    if (!accessToken) {
      setDocuments([]);
      return;
    }

    try {
      setDocuments(await fetchDocuments(accessToken));
    } catch {
      setDocuments([]);
    }
  }

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

    fetchDocuments(accessToken)
      .then((nextDocuments) => {
        if (!ignore) {
          setDocuments(nextDocuments);
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
      await refreshDocuments();
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
      await refreshDocuments();
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

  if (!session) {
    return (
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
    );
  }

  return (
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
                  {deletingDocumentId === document.id ? "Deleting..." : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <span>No documents uploaded.</span>
        )}
      </div>
    </section>
  );
}
