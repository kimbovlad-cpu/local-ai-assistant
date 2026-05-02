import { createClient } from "@supabase/supabase-js";

export function createSupabaseServerClient(accessToken?: string) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_ANON_KEY are required for document storage."
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`
          }
        : {}
    }
  });
}

export async function authenticateSupabaseRequest(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const accessToken = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!accessToken) {
    return { error: "Admin login is required.", accessToken: null };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return { error: "Admin session is invalid.", accessToken: null };
  }

  return { error: null, accessToken };
}
