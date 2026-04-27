export type UploadedDocument = {
  id: string;
  name: string;
  text: string;
  uploadedAt: string;
};

const documents: UploadedDocument[] = [];

export function addDocument(name: string, text: string) {
  const document: UploadedDocument = {
    id: crypto.randomUUID(),
    name,
    text,
    uploadedAt: new Date().toISOString()
  };

  documents.push(document);

  return document;
}

export function getDocuments() {
  return documents;
}
