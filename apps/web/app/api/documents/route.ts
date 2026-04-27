import { addDocument, getDocuments } from "@/lib/document-store";

type DocumentRequest = {
  name?: string;
  text?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as DocumentRequest;
  const name = body.name?.trim() || "Untitled document";
  const text = body.text;

  if (!name.toLowerCase().endsWith(".txt")) {
    return Response.json(
      { error: "Only .txt files are supported." },
      { status: 400 }
    );
  }

  if (typeof text !== "string" || text.trim().length === 0) {
    return Response.json(
      { error: "Document text is required." },
      { status: 400 }
    );
  }

  const document = addDocument(name, text);

  return Response.json({
    document: {
      id: document.id,
      name: document.name,
      characterCount: document.text.length
    },
    documentCount: getDocuments().length
  });
}
