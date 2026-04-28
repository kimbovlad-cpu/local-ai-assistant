import OpenAI from "openai";
import { chunkText, storeDocumentChunks } from "@/lib/document-store";

type DocumentRequest = {
  name?: string;
  text?: string;
};

const embeddingModel = "text-embedding-3-small";

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

    await storeDocumentChunks(name, chunks, embeddings);

    return Response.json({
      document: {
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
