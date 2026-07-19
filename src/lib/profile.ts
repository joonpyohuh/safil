import {
  getSupabase,
  isSupabaseConfigured,
  type DbCafeProfile,
} from "@/lib/supabase/server";
import { type CafeProfile, type CafeProfileInput, toneValues, type Tone } from "@/lib/schemas";

const PROFILE_ID = 1;

function mapRow(row: DbCafeProfile): CafeProfile {
  return {
    name: row.name,
    location: row.location,
    concept: row.concept,
    introduction: row.introduction,
    menus: Array.isArray(row.menus) ? row.menus.filter((m): m is string => typeof m === "string") : [],
    tone: (toneValues as readonly string[]).includes(row.tone) ? (row.tone as Tone) : "warm",
    customerType: row.customer_type,
    logoPath: row.logo_path,
    photoPaths: Array.isArray(row.photo_paths)
      ? row.photo_paths.filter((p): p is string => typeof p === "string")
      : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCafeProfile(): Promise<CafeProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await getSupabase()
    .from("cafe_profile")
    .select("*")
    .eq("id", PROFILE_ID)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapRow(data as DbCafeProfile);
}

export async function saveCafeProfile(input: CafeProfileInput): Promise<CafeProfile> {
  if (!isSupabaseConfigured()) throw new Error("SUPABASE_NOT_CONFIGURED");
  const now = Date.now();
  const existing = await getCafeProfile();
  const row = {
    id: PROFILE_ID,
    name: input.name,
    location: input.location,
    concept: input.concept,
    introduction: input.introduction,
    menus: input.menus,
    tone: input.tone,
    customer_type: input.customerType,
    logo_path: input.logoPath,
    photo_paths: input.photoPaths,
    created_at: existing?.createdAt ?? now,
    updated_at: now,
  };
  const { data, error } = await getSupabase()
    .from("cafe_profile")
    .upsert(row)
    .select("*")
    .single();
  if (error) throw error;
  return mapRow(data as DbCafeProfile);
}
