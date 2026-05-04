import {
  createCompany,
  listCompanies,
  normalizeCompanySlug
} from "@/lib/document-store";
import { authenticateSupabaseRequest } from "@/lib/supabase";

type CompanyRequest = {
  name?: string;
  slug?: string;
};

function ensureSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

export async function GET(request: Request) {
  if (!ensureSupabaseConfigured()) {
    return Response.json(
      {
        error:
          "SUPABASE_URL and SUPABASE_ANON_KEY are not configured. Add them before listing companies."
      },
      { status: 500 }
    );
  }

  const auth = await authenticateSupabaseRequest(request);
  if (auth.error || !auth.accessToken) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  try {
    return Response.json({
      companies: await listCompanies(auth.accessToken)
    });
  } catch (error) {
    console.error("Company list failed", error);
    return Response.json(
      { error: "Failed to load companies." },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  if (!ensureSupabaseConfigured()) {
    return Response.json(
      {
        error:
          "SUPABASE_URL and SUPABASE_ANON_KEY are not configured. Add them before creating companies."
      },
      { status: 500 }
    );
  }

  const auth = await authenticateSupabaseRequest(request);
  if (auth.error || !auth.accessToken) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const body = (await request.json()) as CompanyRequest;
  const name = body.name?.trim() ?? "";
  const slug = normalizeCompanySlug(body.slug ?? "");

  if (!name || !slug) {
    return Response.json(
      { error: "Company name and slug are required." },
      { status: 400 }
    );
  }

  try {
    return Response.json(
      {
        company: await createCompany({ name, slug }, auth.accessToken)
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create company.";
    const isUniqueError = message.toLowerCase().includes("duplicate");

    return Response.json(
      {
        error: isUniqueError
          ? "Company slug already exists."
          : "Failed to create company."
      },
      { status: isUniqueError ? 409 : 502 }
    );
  }
}
