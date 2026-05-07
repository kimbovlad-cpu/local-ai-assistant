import { createSupabaseServerClient } from "@/lib/supabase";

export type RetrievedChunk = {
  documentId: string;
  documentName: string;
  chunkIndex: number;
  content: string;
  score: number;
};

export type Company = {
  id: string;
  name: string;
  notificationEmail: string | null;
  slug: string;
};

export type StoredDocument = {
  id: string;
  companyId: string;
  name: string;
  createdAt: string;
};

export type Lead = {
  id: string;
  companyId: string;
  name: string;
  email: string;
  question: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  companyId: string;
  sessionId: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
};

export type ChatSession = {
  id: string;
  companyId: string;
  visitorId: string | null;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};

type DocumentChunkInsert = {
  document_id: string;
  company_id: string;
  document_name: string;
  chunk_index: number;
  content: string;
  embedding: number[];
};

type MatchDocumentChunkRow = {
  document_id: string;
  document_name: string;
  chunk_index: number;
  content: string;
  similarity: number;
};

type LeadRow = {
  id: string;
  company_id: string;
  name: string;
  email: string;
  question: string;
  created_at: string;
};

type ChatSessionRow = {
  id: string;
  company_id: string;
  visitor_id: string | null;
  created_at: string;
  updated_at: string;
};

type ChatMessageRow = {
  id: string;
  company_id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
};

const chunkSize = 800;
const maxRetrievedChunks = 3;
export const defaultCompanySlug = "default";

export function normalizeCompanySlug(slug: string) {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function chunkText(text: string) {
  const chunks: string[] = [];

  for (let index = 0; index < text.length; index += chunkSize) {
    chunks.push(text.slice(index, index + chunkSize));
  }

  return chunks;
}

export async function getCompanyBySlug(
  slug = defaultCompanySlug,
  accessToken?: string
) {
  const supabase = createSupabaseServerClient(accessToken);
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, notification_email, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load company: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id as string,
    name: data.name as string,
    notificationEmail: (data.notification_email as string | null) ?? null,
    slug: data.slug as string
  } satisfies Company;
}

export async function getCompanyById(id: string, accessToken?: string) {
  const supabase = createSupabaseServerClient(accessToken);
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, notification_email, slug")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load company: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id as string,
    name: data.name as string,
    notificationEmail: (data.notification_email as string | null) ?? null,
    slug: data.slug as string
  } satisfies Company;
}

export async function resolveCompany(
  input: { companyId?: string; companySlug?: string },
  accessToken?: string
) {
  if (input.companyId?.trim()) {
    return getCompanyById(input.companyId.trim(), accessToken);
  }

  return getCompanyBySlug(
    normalizeCompanySlug(input.companySlug ?? defaultCompanySlug) ||
      defaultCompanySlug,
    accessToken
  );
}

export async function getDefaultCompany(accessToken?: string) {
  const company = await getCompanyBySlug(defaultCompanySlug, accessToken);

  if (!company) {
    throw new Error('Default company "default" was not found.');
  }

  return company;
}

export async function listCompanies(accessToken?: string) {
  const supabase = createSupabaseServerClient(accessToken);
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, notification_email, slug")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to list companies: ${error.message}`);
  }

  return (data ?? []).map(
    (company): Company => ({
      id: company.id as string,
      name: company.name as string,
      notificationEmail: (company.notification_email as string | null) ?? null,
      slug: company.slug as string
    })
  );
}

export async function createCompany(
  input: { name: string; slug: string },
  accessToken?: string
) {
  const name = input.name.trim();
  const slug = normalizeCompanySlug(input.slug);

  if (!name) {
    throw new Error("Company name is required.");
  }

  if (!slug) {
    throw new Error("Company slug is required.");
  }

  const supabase = createSupabaseServerClient(accessToken);
  const { data, error } = await supabase
    .from("companies")
    .insert({ name, slug })
    .select("id, name, notification_email, slug")
    .single();

  if (error) {
    throw new Error(`Failed to create company: ${error.message}`);
  }

  return {
    id: data.id as string,
    name: data.name as string,
    notificationEmail: (data.notification_email as string | null) ?? null,
    slug: data.slug as string
  } satisfies Company;
}

export async function updateCompanyNotificationEmail(
  companyId: string,
  notificationEmail: string | null,
  accessToken?: string
) {
  const supabase = createSupabaseServerClient(accessToken);
  const { data, error } = await supabase
    .from("companies")
    .update({ notification_email: notificationEmail })
    .eq("id", companyId)
    .select("id, name, notification_email, slug")
    .single();

  if (error) {
    throw new Error(`Failed to update company: ${error.message}`);
  }

  return {
    id: data.id as string,
    name: data.name as string,
    notificationEmail: (data.notification_email as string | null) ?? null,
    slug: data.slug as string
  } satisfies Company;
}

export async function createDocument(
  name: string,
  companyId: string,
  accessToken?: string
) {
  const supabase = createSupabaseServerClient(accessToken);
  const { data, error } = await supabase
    .from("documents")
    .insert({ company_id: companyId, name })
    .select("id, company_id, name, created_at")
    .single();

  if (error) {
    throw new Error(`Failed to create document: ${error.message}`);
  }

  return {
    id: data.id as string,
    companyId: data.company_id as string,
    name: data.name as string,
    createdAt: data.created_at as string
  } satisfies StoredDocument;
}

export async function listDocuments(companyId: string, accessToken?: string) {
  const supabase = createSupabaseServerClient(accessToken);
  const { data, error } = await supabase
    .from("documents")
    .select("id, company_id, name, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list documents: ${error.message}`);
  }

  return (data ?? []).map(
    (document): StoredDocument => ({
      id: document.id as string,
      companyId: document.company_id as string,
      name: document.name as string,
      createdAt: document.created_at as string
    })
  );
}

export async function deleteDocument(
  id: string,
  companyId: string,
  accessToken?: string
) {
  const supabase = createSupabaseServerClient(accessToken);
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }
}

export async function createLead(input: {
  companyId: string;
  name: string;
  email: string;
  question: string;
}) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      company_id: input.companyId,
      email: input.email,
      name: input.name,
      question: input.question
    })
    .select("id, company_id, name, email, question, created_at")
    .single();

  if (error) {
    throw new Error(`Failed to create lead: ${error.message}`);
  }

  return mapLead(data as LeadRow);
}

export async function listLeads(companyId: string, accessToken?: string) {
  const supabase = createSupabaseServerClient(accessToken);
  const { data, error } = await supabase
    .from("leads")
    .select("id, company_id, name, email, question, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    throw new Error(`Failed to list leads: ${error.message}`);
  }

  return ((data ?? []) as LeadRow[]).map(mapLead);
}

export async function getOrCreateChatSession(input: {
  companyId: string;
  sessionId?: string;
  visitorId?: string;
}) {
  const supabase = createSupabaseServerClient();

  if (input.sessionId?.trim()) {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("id, company_id, visitor_id, created_at, updated_at")
      .eq("id", input.sessionId.trim())
      .eq("company_id", input.companyId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load chat session: ${error.message}`);
    }

    if (data) {
      return mapChatSession(data as ChatSessionRow, []);
    }
  }

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({
      company_id: input.companyId,
      visitor_id: input.visitorId?.trim() || null
    })
    .select("id, company_id, visitor_id, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(`Failed to create chat session: ${error.message}`);
  }

  return mapChatSession(data as ChatSessionRow, []);
}

export async function createChatMessage(input: {
  companyId: string;
  content: string;
  role: "assistant" | "user";
  sessionId: string;
}) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      company_id: input.companyId,
      content: input.content,
      role: input.role,
      session_id: input.sessionId
    })
    .select("id, company_id, session_id, role, content, created_at")
    .single();

  if (error) {
    throw new Error(`Failed to create chat message: ${error.message}`);
  }

  await touchChatSession(input.sessionId, input.companyId);

  return mapChatMessage(data as ChatMessageRow);
}

export async function listChatSessions(companyId: string, accessToken?: string) {
  const supabase = createSupabaseServerClient(accessToken);
  const { data: sessions, error: sessionError } = await supabase
    .from("chat_sessions")
    .select("id, company_id, visitor_id, created_at, updated_at")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (sessionError) {
    throw new Error(`Failed to list chat sessions: ${sessionError.message}`);
  }

  const sessionRows = (sessions ?? []) as ChatSessionRow[];
  const sessionIds = sessionRows.map((session) => session.id);

  if (sessionIds.length === 0) {
    return [];
  }

  const { data: messages, error: messageError } = await supabase
    .from("chat_messages")
    .select("id, company_id, session_id, role, content, created_at")
    .eq("company_id", companyId)
    .in("session_id", sessionIds)
    .order("created_at", { ascending: true });

  if (messageError) {
    throw new Error(`Failed to list chat messages: ${messageError.message}`);
  }

  const messagesBySession = ((messages ?? []) as ChatMessageRow[]).reduce<
    Record<string, ChatMessage[]>
  >((groups, message) => {
    groups[message.session_id] = groups[message.session_id] ?? [];
    groups[message.session_id].push(mapChatMessage(message));
    return groups;
  }, {});

  return sessionRows.map((session) =>
    mapChatSession(session, messagesBySession[session.id] ?? [])
  );
}

export async function storeDocumentChunks(
  document: StoredDocument,
  chunks: string[],
  embeddings: number[][],
  accessToken?: string
) {
  if (chunks.length !== embeddings.length) {
    throw new Error("Each document chunk must have a matching embedding.");
  }

  const rows: DocumentChunkInsert[] = chunks.map((chunk, index) => ({
    document_id: document.id,
    company_id: document.companyId,
    document_name: document.name,
    chunk_index: index + 1,
    content: chunk,
    embedding: embeddings[index]
  }));

  const supabase = createSupabaseServerClient(accessToken);
  const { error } = await supabase.from("document_chunks").insert(rows);

  if (error) {
    throw new Error(`Failed to store document chunks: ${error.message}`);
  }
}

export async function retrieveRelevantChunks(
  queryEmbedding: number[],
  companyId: string
) {
  if (queryEmbedding.length === 0) {
    return [];
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: queryEmbedding,
    query_company_id: companyId,
    match_count: maxRetrievedChunks
  });

  if (error) {
    throw new Error(`Failed to retrieve document chunks: ${error.message}`);
  }

  return ((data ?? []) as MatchDocumentChunkRow[]).map(
    (chunk): RetrievedChunk => ({
      documentId: chunk.document_id,
      documentName: chunk.document_name,
      chunkIndex: chunk.chunk_index,
      content: chunk.content,
      score: chunk.similarity
    })
  );
}

function mapLead(lead: LeadRow): Lead {
  return {
    id: lead.id,
    companyId: lead.company_id,
    name: lead.name,
    email: lead.email,
    question: lead.question,
    createdAt: lead.created_at
  };
}

async function touchChatSession(sessionId: string, companyId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("chat_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("company_id", companyId);

  if (error) {
    throw new Error(`Failed to update chat session: ${error.message}`);
  }
}

function mapChatSession(
  session: ChatSessionRow,
  messages: ChatMessage[]
): ChatSession {
  return {
    id: session.id,
    companyId: session.company_id,
    visitorId: session.visitor_id,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    messages
  };
}

function mapChatMessage(message: ChatMessageRow): ChatMessage {
  return {
    id: message.id,
    companyId: message.company_id,
    sessionId: message.session_id,
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content,
    createdAt: message.created_at
  };
}
