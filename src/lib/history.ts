import { randomUUID } from "node:crypto";
import {
  getSupabase,
  isSupabaseConfigured,
  type DbGeneration,
} from "@/lib/supabase/server";
import type { GenerationRecord, GenerationType, HistoryPatch } from "@/lib/schemas";
import { generationTypeValues } from "@/lib/schemas";

function mapRow(row: DbGeneration): GenerationRecord {
  return {
    id: row.id,
    type: row.type as GenerationType,
    input: row.input,
    options: row.options,
    selectedIndex: row.selected_index,
    copied: row.copied,
    downloaded: row.downloaded,
    isSample: row.is_sample,
    createdAt: row.created_at,
  };
}

export async function saveGeneration(params: {
  type: GenerationType;
  input: unknown;
  options: unknown[];
  isSample: boolean;
}): Promise<GenerationRecord> {
  if (!isSupabaseConfigured()) throw new Error("SUPABASE_NOT_CONFIGURED");
  const row = {
    id: randomUUID(),
    type: params.type,
    input: params.input,
    options: params.options,
    selected_index: null,
    copied: false,
    downloaded: false,
    is_sample: params.isSample,
    created_at: Date.now(),
  };
  const { data, error } = await getSupabase()
    .from("generations")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return mapRow(data as DbGeneration);
}

export async function listGenerations(params: {
  type?: string;
  limit?: number;
}): Promise<GenerationRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
  const isValidType = (generationTypeValues as readonly string[]).includes(params.type ?? "");
  let query = getSupabase()
    .from("generations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (isValidType) {
    query = query.eq("type", params.type!);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data as DbGeneration[]).map(mapRow);
}

export async function getGeneration(id: string): Promise<GenerationRecord | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await getSupabase()
    .from("generations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as DbGeneration) : null;
}

export async function patchGeneration(
  id: string,
  patch: HistoryPatch,
): Promise<GenerationRecord | null> {
  if (!isSupabaseConfigured()) throw new Error("SUPABASE_NOT_CONFIGURED");
  const updates: Record<string, unknown> = {};
  if (patch.selectedIndex !== undefined) updates.selected_index = patch.selectedIndex;
  if (patch.copied !== undefined) updates.copied = patch.copied;
  if (patch.downloaded !== undefined) updates.downloaded = patch.downloaded;
  const { data, error } = await getSupabase()
    .from("generations")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as DbGeneration) : null;
}

export async function deleteGeneration(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) throw new Error("SUPABASE_NOT_CONFIGURED");
  const { error, count } = await getSupabase()
    .from("generations")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw error;
  return (count ?? 0) > 0;
}
