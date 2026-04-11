import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const STORAGE_BUCKET = "uploads";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? anonKey;

// Publieke client (voor lezen)
let _client: SupabaseClient | null = null;
export function getSupabase() {
  if (!_client && url) _client = createClient(url, anonKey);
  return _client!;
}

// Admin client (voor writes/uploads — bypast RLS)
let _admin: SupabaseClient | null = null;
export function getAdminSupabase() {
  if (!_admin && url) _admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  return _admin!;
}

// Proxy voor backwards-compatibility
export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    return (getAdminSupabase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export function storageUrl(path: string) {
  return `${url}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}
