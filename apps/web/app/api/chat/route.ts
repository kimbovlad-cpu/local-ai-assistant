import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import {
  getDocuments,
  retrieveRelevantChunks,
  type RetrievedChunk
} from "@/lib/document-store";

type ChatRequest = {
  messages?: Array<{
    role?: string;
    content?: string;
  }>;
};

const model = "gpt-4o-mini";
const embeddingModel = "text-embedding-3-small";

function buildSystemPrompt(retrievedChunks: RetrievedChunk[]) {
  const documents = getDocuments();

  if (documents.length === 0) {
    return "You are a concise, helpful AI assistant for a local assistant MVP.";
  }

  if (retrievedChunks.length === 0) {
    return `You are a concise, helpful AI assistant for a local assistant MVP.

The user has uploaded documents, but no document chunks are available for the user's latest question.
If the answer is not in the uploaded document context, say so.`;
  }

  const documentContext = retrievedChunks
    .map(
      (chunk) =>
        `Document ${chunk.documentIndex + 1}: ${chunk.documentName}, chunk ${
          chunk.chunkIndex + 1
        }\n${chunk.content}`
    )
    .join("\n\n---\n\n");

  return `You are a concise, helpful AI assistant for a local assistant MVP.

Use the uploaded document context when it is relevant to the user's question.
If the answer is not in the uploaded document context, say so.

Uploaded document context:
${documentContext}`;
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY is not configured." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = (await request.json()) as ChatRequest;
  const messages = (body.messages ?? []).filter(
    (message): message is { role: "assistant" | "user"; content: string } =>
      (message.role === "assistant" || message.role === "user") &&
      typeof message.content === "string" &&
      message.content.trim().length > 0
  );
  const hasUserMessage = messages.some((message) => message.role === "user");
  const latestUserMessage = messages.findLast(
    (message) => message.role === "user"
  );

  if (!hasUserMessage) {
    return new Response(
      JSON.stringify({ error: "A user message is required." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  try {
    let retrievedChunks: RetrievedChunk[] = [];

    if (getDocuments().length > 0) {
      const embeddingResponse = await openai.embeddings.create({
        model: embeddingModel,
        input: latestUserMessage?.content.trim() ?? ""
      });
      const queryEmbedding = embeddingResponse.data[0]?.embedding ?? [];
      retrievedChunks = retrieveRelevantChunks(queryEmbedding);
    }

    const stream = await openai.chat.completions.create({
      model,
      stream: true,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(retrievedChunks)
        },
        ...messages.map(
          (message): ChatCompletionMessageParam => ({
            role: message.role,
            content: message.content.trim()
          })
        )
      ]
    });

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              controller.enqueue(encoder.encode(delta));
            }
          }
          controller.close();
        } catch (streamError) {
          console.error("OpenAI chat stream failed", streamError);
          controller.error(streamError);
        }
      }
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  } catch (error) {
    console.error("OpenAI chat request failed", error);

    return new Response(
      JSON.stringify({ error: "Failed to generate a response." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
