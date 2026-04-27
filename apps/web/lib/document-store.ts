export type UploadedDocument = {
  id: string;
  name: string;
  chunks: string[];
  characterCount: number;
  uploadedAt: string;
};

const chunkSize = 800;
const documents: UploadedDocument[] = [];

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
