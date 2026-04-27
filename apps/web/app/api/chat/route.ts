import { NextResponse } from "next/server";

type ChatRequest = {
  messages?: Array<{
    role?: string;
    content?: string;
  }>;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequest;
  const latestUserMessage = [...(body.messages ?? [])]
    .reverse()
    .find((message) => message.role === "user");

  if (!latestUserMessage?.content?.trim()) {
    return NextResponse.json(
      { error: "A user message is required." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    message: `Mock response: I received "${latestUserMessage.content.trim()}". Real model integration comes next.`
  });
}
