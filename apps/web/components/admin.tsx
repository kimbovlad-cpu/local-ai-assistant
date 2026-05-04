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

type Company = {
  id: string;
  name: string;
  notificationEmail: string | null;
  slug: string;
};

type Lead = {
  id: string;
  name: string;
  email: string;
  question: string;
  createdAt: string;
};

type AdminProps = {
  supabaseAnonKey: string;
  supabaseUrl: string;
};

async function fetchCompanies(accessToken: string) {
  const response = await fetch("/api/companies", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    return [];
  }

  const body = (await response.json()) as {
    companies?: Company[];
  };
  return body.companies ?? [];
}

async function fetchDocuments(accessToken: string, companySlug: string) {
  const response = await fetch(
    `/api/documents?companySlug=${encodeURIComponent(companySlug)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );
  if (!response.ok) {
    return [];
  }

  const body = (await response.json()) as {
    documents?: StoredDocument[];
  };
  return body.documents ?? [];
}

async function fetchLeads(accessToken: string, companySlug: string) {
  const response = await fetch(
    `/api/leads?companySlug=${encodeURIComponent(companySlug)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );
  if (!response.ok) {
    return [];
  }

  const body = (await response.json()) as {
    leads?: Lead[];
  };
  return body.leads ?? [];
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
  const [companyStatus, setCompanyStatus] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanySlug, setSelectedCompanySlug] = useState("default");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanySlug, setNewCompanySlug] = useState("");
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [isSavingNotificationEmail, setIsSavingNotificationEmail] =
    useState(false);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return null;
    }

    return createClient(supabaseUrl, supabaseAnonKey);
  }, [supabaseAnonKey, supabaseUrl]);
  const selectedCompany = companies.find(
    (company) => company.slug === selectedCompanySlug
  );

  async function refreshCompanies() {
    const accessToken = session?.access_token;
    if (!accessToken) {
      setCompanies([]);
      return [];
    }

    const nextCompanies = await fetchCompanies(accessToken);
    setCompanies(nextCompanies);

    if (
      nextCompanies.length > 0 &&
      !nextCompanies.some((company) => company.slug === selectedCompanySlug)
    ) {
      setSelectedCompanySlug(nextCompanies[0].slug);
      setNotificationEmail(nextCompanies[0].notificationEmail ?? "");
    }

    return nextCompanies;
  }

  async function refreshDocuments(companySlug = selectedCompanySlug) {
    const accessToken = session?.access_token;
    if (!accessToken || !companySlug) {
      setDocuments([]);
      return;
    }

    try {
      setDocuments(await fetchDocuments(accessToken, companySlug));
    } catch {
      setDocuments([]);
    }
  }

  async function refreshLeads(companySlug = selectedCompanySlug) {
    const accessToken = session?.access_token;
    if (!accessToken || !companySlug) {
      setLeads([]);
      return;
    }

    try {
      setLeads(await fetchLeads(accessToken, companySlug));
    } catch {
      setLeads([]);
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
        setCompanies([]);
        setDocuments([]);
        setLeads([]);
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

    fetchCompanies(accessToken)
      .then(async (nextCompanies) => {
        if (!ignore) {
          setCompanies(nextCompanies);
          const initialCompany =
            nextCompanies.find((company) => company.slug === "default") ??
            nextCompanies[0];
          const nextSlug = initialCompany?.slug ?? "default";
          setSelectedCompanySlug(nextSlug);
          setNotificationEmail(initialCompany?.notificationEmail ?? "");
          setDocuments(await fetchDocuments(accessToken, nextSlug));
          setLeads(await fetchLeads(accessToken, nextSlug));
        }
      })
      .catch(() => {
        if (!ignore) {
          setCompanies([]);
          setDocuments([]);
          setLeads([]);
        }
      });

    return () => {
      ignore = true;
    };
  }, [session?.access_token]);

  useEffect(() => {
    const accessToken = session?.access_token;
    if (!accessToken || !selectedCompanySlug) {
      return;
    }

    let ignore = false;

    fetchDocuments(accessToken, selectedCompanySlug)
      .then(async (nextDocuments) => {
        if (!ignore) {
          setDocuments(nextDocuments);
          setLeads(await fetchLeads(accessToken, selectedCompanySlug));
        }
      })
      .catch(() => {
        if (!ignore) {
          setDocuments([]);
          setLeads([]);
        }
      });

    return () => {
      ignore = true;
    };
  }, [selectedCompanySlug, session?.access_token]);

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
    setCompanies([]);
    setDocuments([]);
    setLeads([]);
    setCompanyStatus(null);
    setUploadStatus(null);
    setAuthStatus("Logged out.");
  }

  async function handleCompanyCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const accessToken = session?.access_token;
    if (!accessToken) {
      setCompanyStatus("Admin login is required.");
      return;
    }

    setIsCreatingCompany(true);
    setCompanyStatus(null);

    try {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: newCompanyName,
          slug: newCompanySlug
        })
      });
      const body = (await response.json().catch(() => null)) as {
        company?: Company;
        error?: string;
      } | null;

      if (!response.ok || !body?.company) {
        throw new Error(body?.error ?? "Company create failed.");
      }

      setNewCompanyName("");
      setNewCompanySlug("");
      setSelectedCompanySlug(body.company.slug);
      setCompanyStatus(`Created ${body.company.name}.`);
      await refreshCompanies();
      await refreshDocuments(body.company.slug);
      await refreshLeads(body.company.slug);
    } catch (caughtError) {
      setCompanyStatus(
        caughtError instanceof Error
          ? caughtError.message
          : "Company create failed."
      );
    } finally {
      setIsCreatingCompany(false);
    }
  }

  async function handleNotificationEmailSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const accessToken = session?.access_token;
    if (!accessToken || !selectedCompany) {
      setCompanyStatus("Admin login is required.");
      return;
    }

    setIsSavingNotificationEmail(true);
    setCompanyStatus(null);

    try {
      const response = await fetch("/api/companies", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          companyId: selectedCompany.id,
          notificationEmail
        })
      });
      const body = (await response.json().catch(() => null)) as {
        company?: Company;
        error?: string;
      } | null;

      if (!response.ok || !body?.company) {
        throw new Error(body?.error ?? "Notification email save failed.");
      }

      setCompanies((current) =>
        current.map((company) =>
          company.id === body.company?.id ? body.company : company
        )
      );
      setNotificationEmail(body.company.notificationEmail ?? "");
      setCompanyStatus("Notification email saved.");
    } catch (caughtError) {
      setCompanyStatus(
        caughtError instanceof Error
          ? caughtError.message
          : "Notification email save failed."
      );
    } finally {
      setIsSavingNotificationEmail(false);
    }
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
          companySlug: selectedCompanySlug,
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
        `/api/documents?id=${encodeURIComponent(
          document.id
        )}&companySlug=${encodeURIComponent(selectedCompanySlug)}`,
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

      <div className="company-controls">
        <label htmlFor="company-select">Company</label>
        <select
          id="company-select"
          onChange={(event) => {
            const nextSlug = event.target.value;
            const nextCompany = companies.find(
              (company) => company.slug === nextSlug
            );
            setSelectedCompanySlug(nextSlug);
            setNotificationEmail(nextCompany?.notificationEmail ?? "");
          }}
          value={selectedCompanySlug}
        >
          {companies.map((company) => (
            <option key={company.id} value={company.slug}>
              {company.name} ({company.slug})
            </option>
          ))}
        </select>
      </div>

      <form className="company-create" onSubmit={handleCompanyCreate}>
        <label htmlFor="company-name">New company</label>
        <input
          id="company-name"
          onChange={(event) => setNewCompanyName(event.target.value)}
          placeholder="Company name"
          value={newCompanyName}
        />
        <input
          id="company-slug"
          onChange={(event) => setNewCompanySlug(event.target.value)}
          placeholder="company-slug"
          value={newCompanySlug}
        />
        <button disabled={isCreatingCompany} type="submit">
          {isCreatingCompany ? "Creating..." : "Create"}
        </button>
      </form>

      {companyStatus ? <p className="upload-message">{companyStatus}</p> : null}

      <form
        className="company-notification"
        onSubmit={handleNotificationEmailSave}
      >
        <label htmlFor="notification-email">Notification Email</label>
        <input
          id="notification-email"
          onChange={(event) => setNotificationEmail(event.target.value)}
          placeholder="leads@example.com"
          type="email"
          value={notificationEmail}
        />
        <button disabled={isSavingNotificationEmail} type="submit">
          {isSavingNotificationEmail ? "Saving..." : "Save"}
        </button>
      </form>

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

      <div className="lead-list" aria-label="Recent leads">
        <p>Leads</p>
        {leads.length > 0 ? (
          <ul>
            {leads.map((lead) => (
              <li key={lead.id}>
                <strong>{lead.name}</strong>
                <a href={`mailto:${lead.email}`}>{lead.email}</a>
                <span>{lead.question}</span>
                <time dateTime={lead.createdAt}>
                  {new Date(lead.createdAt).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <span>No leads yet.</span>
        )}
      </div>
    </section>
  );
}
