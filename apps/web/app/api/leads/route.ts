import {
  type Company,
  type Lead,
  createLead,
  defaultCompanySlug,
  listLeads,
  resolveCompany
} from "@/lib/document-store";
import { authenticateSupabaseRequest } from "@/lib/supabase";

type LeadRequest = {
  companySlug?: string;
  email?: string;
  name?: string;
  question?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function ensureSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

async function sendLeadNotification(company: Company, lead: Lead) {
  if (!company.notificationEmail) {
    return;
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL;

  if (!resendApiKey || !fromEmail) {
    console.warn(
      "Lead notification skipped because RESEND_API_KEY or FROM_EMAIL is missing."
    );
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: company.notificationEmail,
        subject: `New chatbot lead from ${company.name}`,
        text: [
          `Company: ${company.name}`,
          `Visitor name: ${lead.name}`,
          `Visitor email: ${lead.email}`,
          `Question: ${lead.question}`,
          `Created: ${new Date(lead.createdAt).toLocaleString()}`
        ].join("\n")
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.warn(
        `Lead notification failed with status ${response.status}. ${errorText}`
      );
    }
  } catch (error) {
    console.warn("Lead notification failed.", error);
  }
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
      companySlug: url.searchParams.get("companySlug") ?? defaultCompanySlug
    },
    auth.accessToken
  );

  if (!company) {
    return Response.json({ error: "Company was not found." }, { status: 404 });
  }

  try {
    return Response.json({
      leads: await listLeads(company.id, auth.accessToken)
    });
  } catch (error) {
    console.error("Lead list failed", error);
    return Response.json({ error: "Failed to load leads." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!ensureSupabaseConfigured()) {
    return Response.json(
      { error: "SUPABASE_URL and SUPABASE_ANON_KEY are not configured." },
      { status: 500 }
    );
  }

  const body = (await request.json()) as LeadRequest;
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const question = body.question?.trim() ?? "";
  const companySlug = body.companySlug?.trim() || defaultCompanySlug;

  if (!name || !email || !question) {
    return Response.json(
      { error: "Name, email, and question are required." },
      { status: 400 }
    );
  }

  if (!isValidEmail(email)) {
    return Response.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  const company = await resolveCompany({ companySlug });
  if (!company) {
    return Response.json({ error: "Company was not found." }, { status: 404 });
  }

  try {
    const lead = await createLead({
      companyId: company.id,
      email,
      name,
      question
    });

    await sendLeadNotification(company, lead);

    return Response.json(
      {
        lead
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Lead create failed", error);
    return Response.json({ error: "Failed to save lead." }, { status: 502 });
  }
}
