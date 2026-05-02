type SupabaseAdminConfig = {
  url: string;
  serviceRoleKey: string;
};

function normalizeSupabaseValue(value?: string | null) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized.replace(/\/+$/, "");
}

export function getSupabaseAdminConfig(): SupabaseAdminConfig | null {
  const url = normalizeSupabaseValue(process.env.SUPABASE_URL);
  const serviceRoleKey = normalizeSupabaseValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !serviceRoleKey) {
    return null;
  }

  return {
    url,
    serviceRoleKey
  };
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseAdminConfig());
}

type SupabaseRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  prefer?: string[];
};

export async function supabaseRequest<T>(
  path: string,
  options: SupabaseRequestOptions = {}
) {
  const config = getSupabaseAdminConfig();

  if (!config) {
    throw new Error("Supabase is not configured. Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const headers = new Headers({
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`
  });

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.prefer?.length) {
    headers.set("Prefer", options.prefer.join(","));
  }

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store"
  });

  const rawText = await response.text();
  const data = rawText ? (JSON.parse(rawText) as T) : null;

  if (!response.ok) {
    throw new Error(
      `Supabase request failed (${response.status}) for ${path}: ${rawText || response.statusText}`
    );
  }

  return {
    status: response.status,
    data
  };
}
