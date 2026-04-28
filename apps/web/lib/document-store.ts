export type UploadedDocument = {
  id: string;
  name: string;
  chunks: string[];
  characterCount: number;
  uploadedAt: string;
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

function tokenize(text: string) {
  return text
    .toLowerCase()
    .match(/[a-z0-9]+/g) ?? [];
}

function chunkText(text: string) {
  const chunks: string[] = [];

  for (let index = 0; index < text.length; index += chunkSize) {
    chunks.push(text.slice(index, index + chunkSize));
  }

  return chunks;
}

export function addDocument(name: string, text: string) {
  const document: UploadedDocument = {
    id: crypto.randomUUID(),
    name,
    chunks: chunkText(text),
    characterCount: text.length,
    uploadedAt: new Date().toISOString()
  };

  documents.push(document);

  return document;
}

export function getDocuments() {
  return documents;
}

export function retrieveRelevantChunks(query: string) {
  const queryKeywords = new Set(tokenize(query));

  if (queryKeywords.size === 0) {
    return [];
  }

  return documents
    .flatMap((document, documentIndex) =>
      document.chunks.map((chunk, chunkIndex): RetrievedChunk => {
        const chunkKeywords = new Set(tokenize(chunk));
        let score = 0;

        for (const keyword of queryKeywords) {
          if (chunkKeywords.has(keyword)) {
            score += 1;
          }
        }

        return {
          documentName: document.name,
          documentIndex,
          chunkIndex,
          content: chunk,
          score
        };
      })
    )
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxRetrievedChunks);
}
