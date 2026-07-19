import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type DbCafeProfile = {
  id: number;
  name: string;
  location: string;
  concept: string;
  introduction: string;
  menus: string[];
  tone: string;
  customer_type: string;
  logo_path: string | null;
  photo_paths: string[];
  created_at: number;
  updated_at: number;
};

export type DbGeneration = {
  id: string;
  type: string;
  input: unknown;
  options: unknown[];
  selected_index: number | null;
  copied: boolean;
  downloaded: boolean;
  is_sample: boolean;
  created_at: number;
};

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim();
  return Boolean(url && key);
}

function getSupabaseKey(): string {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim();
  if (!key) throw new Error("SUPABASE_NOT_CONFIGURED");
  return key;
}

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }
  client ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabaseKey(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return client;
}
