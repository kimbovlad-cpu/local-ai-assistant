export type UploadedDocument = {
  id: string;
  name: string;
  chunks: DocumentChunk[];
  characterCount: number;
  uploadedAt: string;
};

export type DocumentChunk = {
  documentName: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
};

export type RetrievedChunk = {
  documentName: string;
  documentIndex: number;
  chunkIndex: number;
  content: string;
  score: number;
};

const chunkSize = 800;
const maxRetrievedChunks = 3;
const documents: UploadedDocument[] = [];

export function chunkText(text: string) {
  const chunks: string[] = [];

  for (let index = 0; index < text.length; index += chunkSize) {
    chunks.push(text.slice(index, index + chunkSize));
  }

  return chunks;
}

function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let aMagnitude = 0;
  let bMagnitude = 0;

  for (let index = 0; index < a.length; index += 1) {
    dotProduct += a[index] * b[index];
    aMagnitude += a[index] * a[index];
    bMagnitude += b[index] * b[index];
  }

  if (aMagnitude === 0 || bMagnitude === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(aMagnitude) * Math.sqrt(bMagnitude));
}

export function addDocument(
  name: string,
  text: string,
  chunkEmbeddings: number[][]
) {
  const textChunks = chunkText(text);

  if (textChunks.length !== chunkEmbeddings.length) {
    throw new Error("Each document chunk must have a matching embedding.");
  }

  const document: UploadedDocument = {
    id: crypto.randomUUID(),
    name,
    chunks: textChunks.map((chunk, index) => ({
      documentName: name,
      chunkIndex: index,
      text: chunk,
      embedding: chunkEmbeddings[index]
    })),
    characterCount: text.length,
    uploadedAt: new Date().toISOString()
  };

  documents.push(document);

  return document;
}

export function getDocuments() {
  return documents;
}

export function retrieveRelevantChunks(queryEmbedding: number[]) {
  if (queryEmbedding.length === 0) {
    return [];
  }

  return documents
    .flatMap((document, documentIndex) =>
      document.chunks.map((chunk, chunkIndex): RetrievedChunk => {
        return {
          documentName: document.name,
          documentIndex,
          chunkIndex: chunk.chunkIndex,
          content: chunk.text,
          score: cosineSimilarity(queryEmbedding, chunk.embedding)
        };
      })
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, maxRetrievedChunks);
}
