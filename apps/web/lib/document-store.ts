import { createSupabaseServerClient } from "@/lib/supabase";

export type RetrievedChunk = {
  documentName: string;
  chunkIndex: number;
  content: string;
  score: number;
};

type DocumentChunkInsert = {
  document_name: string;
  chunk_index: number;
  content: string;
  embedding: number[];
};

type MatchDocumentChunkRow = {
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

export async function storeDocumentChunks(
  documentName: string,
  chunks: string[],
  embeddings: number[][]
) {
  if (chunks.length !== embeddings.length) {
    throw new Error("Each document chunk must have a matching embedding.");
  }

  const rows: DocumentChunkInsert[] = chunks.map((chunk, index) => ({
    document_name: documentName,
    chunk_index: index + 1,
    content: chunk,
    embedding: embeddings[index]
  }));

  const supabase = createSupabaseServerClient();
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
      documentName: chunk.document_name,
      chunkIndex: chunk.chunk_index,
      content: chunk.content,
      score: chunk.similarity
    })
  );
}
