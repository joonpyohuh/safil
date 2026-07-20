import {
  getSupabase,
  isSupabaseConfigured,
  type DbCafeProfile,
} from "@/lib/supabase/server";
import {
  type CafeProfile,
  type CafeProfileInput,
  toneValues,
  type Tone,
  vibeTagValues,
  type VibeTag,
} from "@/lib/schemas";

const PROFILE_ID = 1;

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function mapRow(row: DbCafeProfile): CafeProfile {
  const vibeTags = asStringArray(row.vibe_tags).filter((tag): tag is VibeTag =>
    (vibeTagValues as readonly string[]).includes(tag),
  );
  return {
    name: row.name,
    location: row.location,
    concept: row.concept ?? "",
    introduction: row.introduction ?? "",
    atmosphere: row.atmosphere ?? "",
    vibeTags,
    menus: asStringArray(row.menus),
    tone: (toneValues as readonly string[]).includes(row.tone) ? (row.tone as Tone) : "warm",
    customerType: row.customer_type ?? "",
    logoPath: row.logo_path,
    photoPaths: asStringArray(row.photo_paths),
    researchSummary: row.research_summary ?? "",
    researchSources: asStringArray(row.research_sources),
    placeConfirmed: Boolean(row.place_confirmed),
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
    atmosphere: input.atmosphere,
    vibe_tags: input.vibeTags,
    menus: input.menus,
    tone: input.tone,
    customer_type: input.customerType,
    logo_path: input.logoPath,
    photo_paths: input.photoPaths,
    research_summary: input.researchSummary,
    research_sources: input.researchSources,
    place_confirmed: input.placeConfirmed,
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
