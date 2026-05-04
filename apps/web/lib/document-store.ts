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
    .select("id, name, slug")
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
    slug: data.slug as string
  } satisfies Company;
}

export async function getCompanyById(id: string, accessToken?: string) {
  const supabase = createSupabaseServerClient(accessToken);
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, slug")
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
    .select("id, name, slug")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to list companies: ${error.message}`);
  }

  return (data ?? []).map(
    (company): Company => ({
      id: company.id as string,
      name: company.name as string,
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
    .select("id, name, slug")
    .single();

  if (error) {
    throw new Error(`Failed to create company: ${error.message}`);
  }

  return {
    id: data.id as string,
    name: data.name as string,
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
