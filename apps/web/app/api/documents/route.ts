import OpenAI from "openai";
import {
  chunkText,
  createDocument,
  deleteDocument,
  listDocuments,
  storeDocumentChunks
} from "@/lib/document-store";

type DocumentRequest = {
  name?: string;
  text?: string;
};

const embeddingModel = "text-embedding-3-small";

export async function GET() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return Response.json(
      {
        error:
          "SUPABASE_URL and SUPABASE_ANON_KEY are not configured. Add them before listing documents."
      },
      { status: 500 }
    );
  }

  try {
    const documents = await listDocuments();
    return Response.json({ documents });
  } catch (error) {
    console.error("Document list failed", error);

    return Response.json(
      { error: "Failed to load uploaded documents." },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      {
        error:
          "OPENAI_API_KEY is not configured. Add it before uploading documents so chunks can be embedded."
      },
      { status: 500 }
    );
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return Response.json(
      {
        error:
          "SUPABASE_URL and SUPABASE_ANON_KEY are not configured. Add them before uploading documents."
      },
      { status: 500 }
    );
  }

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

  const chunks = chunkText(text);
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  try {
    const embeddingResponse = await openai.embeddings.create({
      model: embeddingModel,
      input: chunks
    });

    const embeddings = embeddingResponse.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);

    const document = await createDocument(name);
    await storeDocumentChunks(document, chunks, embeddings);

    return Response.json({
      document: {
        id: document.id,
        name,
        characterCount: text.length,
        chunkCount: chunks.length
      }
    });
  } catch (error) {
    console.error("Document upload failed", error);

    return Response.json(
      { error: "Failed to embed and store the uploaded document." },
      { status: 502 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return Response.json(
      {
        error:
          "SUPABASE_URL and SUPABASE_ANON_KEY are not configured. Add them before deleting documents."
      },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim();

  if (!id) {
    return Response.json(
      { error: "Document id is required." },
      { status: 400 }
    );
  }

  try {
    await deleteDocument(id);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Document delete failed", error);

    return Response.json(
      { error: "Failed to delete document." },
      { status: 502 }
    );
  }
}
