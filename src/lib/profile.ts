import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { type CafeProfile, type CafeProfileInput, toneValues, type Tone } from "@/lib/schemas";

const PROFILE_ID = 1; // Single-café pilot mode (see DECISIONS.md 2026-07-19).

function parseStringArray(json: string): string[] {
  try {
    const value = JSON.parse(json);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function getCafeProfile(): CafeProfile | null {
  const db = getDb();
  const row = db
    .select()
    .from(schema.cafeProfile)
    .where(eq(schema.cafeProfile.id, PROFILE_ID))
    .get();
  if (!row) return null;
  return {
    name: row.name,
    location: row.location,
    concept: row.concept,
    introduction: row.introduction,
    menus: parseStringArray(row.menus),
    tone: (toneValues as readonly string[]).includes(row.tone) ? (row.tone as Tone) : "warm",
    customerType: row.customerType,
    logoPath: row.logoPath,
    photoPaths: parseStringArray(row.photoPaths),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function saveCafeProfile(input: CafeProfileInput): CafeProfile {
  const db = getDb();
  const now = Date.now();
  const existing = db
    .select({ createdAt: schema.cafeProfile.createdAt })
    .from(schema.cafeProfile)
    .where(eq(schema.cafeProfile.id, PROFILE_ID))
    .get();
  const values = {
    id: PROFILE_ID,
    name: input.name,
    location: input.location,
    concept: input.concept,
    introduction: input.introduction,
    menus: JSON.stringify(input.menus),
    tone: input.tone,
    customerType: input.customerType,
    logoPath: input.logoPath,
    photoPaths: JSON.stringify(input.photoPaths),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  db.insert(schema.cafeProfile)
    .values(values)
    .onConflictDoUpdate({ target: schema.cafeProfile.id, set: values })
    .run();
  return getCafeProfile()!;
}
