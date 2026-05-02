import { createSupabaseServerClient } from "@/lib/supabase";

export type RetrievedChunk = {
  documentId: string;
  documentName: string;
  chunkIndex: number;
  content: string;
  score: number;
};

export type StoredDocument = {
  id: string;
  name: string;
  createdAt: string;
};

type DocumentChunkInsert = {
  document_id: string;
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

const chunkSize = 800;
const maxRetrievedChunks = 3;

export function chunkText(text: string) {
  const chunks: string[] = [];

  for (let index = 0; index < text.length; index += chunkSize) {
    chunks.push(text.slice(index, index + chunkSize));
  }

  return chunks;
}

export async function createDocument(name: string, accessToken?: string) {
  const supabase = createSupabaseServerClient(accessToken);
  const { data, error } = await supabase
    .from("documents")
    .insert({ name })
    .select("id, name, created_at")
    .single();

  if (error) {
    throw new Error(`Failed to create document: ${error.message}`);
  }

  return {
    id: data.id as string,
    name: data.name as string,
    createdAt: data.created_at as string
  } satisfies StoredDocument;
}

export async function listDocuments(accessToken?: string) {
  const supabase = createSupabaseServerClient(accessToken);
  const { data, error } = await supabase
    .from("documents")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list documents: ${error.message}`);
  }

  return (data ?? []).map(
    (document): StoredDocument => ({
      id: document.id as string,
      name: document.name as string,
      createdAt: document.created_at as string
    })
  );
}

export async function deleteDocument(id: string, accessToken?: string) {
  const supabase = createSupabaseServerClient(accessToken);
  const { error } = await supabase.from("documents").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }
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

export async function retrieveRelevantChunks(queryEmbedding: number[]) {
  if (queryEmbedding.length === 0) {
    return [];
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: queryEmbedding,
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
