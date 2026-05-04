import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import {
  defaultCompanySlug,
  getCompanyBySlug,
  retrieveRelevantChunks,
  type RetrievedChunk
} from "@/lib/document-store";
import { checkRateLimit } from "@/lib/rate-limit";

type ChatRequest = {
  messages?: Array<{
    role?: string;
    content?: string;
  }>;
  companySlug?: string;
};

const model = "gpt-4o-mini";
const embeddingModel = "text-embedding-3-small";
const rateLimitWindowMs = 60 * 1000;
const rateLimitMaxMessages = 10;

function normalizeCompanySlug(slug?: string) {
  return slug?.trim() || defaultCompanySlug;
}

function buildSystemPrompt(retrievedChunks: RetrievedChunk[]) {
  if (retrievedChunks.length === 0) {
    return `You are a concise, helpful AI assistant for a local assistant MVP.

No retrieved sources were found for the user's latest question.
If the answer is not available in the knowledge base, reply exactly:
"I don't have that information yet. You may want to contact the team directly."

Do not mention sources, citations, files, chunks, or retrieved context in the public answer.`;
  }

  const documentContext = retrievedChunks
    .map(
      (chunk) =>
        `[Source: ${chunk.documentName}, chunk ${chunk.chunkIndex}]
${chunk.content}`
    )
    .join("\n\n---\n\n");

  return `You are a concise, helpful AI assistant for a local assistant MVP.

Answer using only the retrieved knowledge base context.
Write naturally, like a website support assistant.
Use markdown when it helps readability.
Do not include a Sources section.
Do not mention source labels, filenames, chunk numbers, citations, or phrases like "according to Source".
If the answer is not available in the retrieved knowledge base context, reply exactly:
"I don't have that information yet. You may want to contact the team directly."

Retrieved knowledge base context with internal labels:
${documentContext}`;
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, {
    limit: rateLimitMaxMessages,
    windowMs: rateLimitWindowMs
  });

  if (!rateLimit.allowed) {
    return Response.json(
      {
        error: "Too many messages. Please wait a minute and try again."
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000))
          )
        }
      }
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY is not configured." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "SUPABASE_URL and SUPABASE_ANON_KEY are not configured. Add them before chatting with documents."
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = (await request.json()) as ChatRequest;
  const companySlug = normalizeCompanySlug(body.companySlug);
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
    const company = await getCompanyBySlug(companySlug);
    if (!company) {
      return Response.json(
        {
          error:
            "I could not find that company workspace. Please check the chat link and try again."
        },
        { status: 404 }
      );
    }

    const embeddingResponse = await openai.embeddings.create({
      model: embeddingModel,
      input: latestUserMessage?.content.trim() ?? ""
    });
    const queryEmbedding = embeddingResponse.data[0]?.embedding ?? [];
    const retrievedChunks = await retrieveRelevantChunks(
      queryEmbedding,
      company.id
    );

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
