import { listChatSessions, resolveCompany } from "@/lib/document-store";
import { authenticateSupabaseRequest } from "@/lib/supabase";

function ensureSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

export async function GET(request: Request) {
  if (!ensureSupabaseConfigured()) {
    return Response.json(
      { error: "SUPABASE_URL and SUPABASE_ANON_KEY are not configured." },
      { status: 500 }
    );
  }

  const auth = await authenticateSupabaseRequest(request);
  if (auth.error || !auth.accessToken) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const url = new URL(request.url);
  const company = await resolveCompany(
    {
      companySlug: url.searchParams.get("companySlug") ?? undefined
    },
    auth.accessToken
  );

  if (!company) {
    return Response.json({ error: "Company was not found." }, { status: 404 });
  }

  try {
    return Response.json({
      sessions: await listChatSessions(company.id, auth.accessToken)
    });
  } catch (error) {
    console.error("Chat log list failed", error);
    return Response.json(
      { error: "Failed to load chat logs." },
      { status: 502 }
    );
  }
}
