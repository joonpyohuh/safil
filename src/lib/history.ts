import { desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb, schema } from "@/lib/db";
import type { GenerationRecord, GenerationType, HistoryPatch } from "@/lib/schemas";
import { generationTypeValues } from "@/lib/schemas";

type GenerationRow = typeof schema.generations.$inferSelect;

function toRecord(row: GenerationRow): GenerationRecord {
  return {
    id: row.id,
    type: row.type as GenerationType,
    input: JSON.parse(row.input),
    options: JSON.parse(row.options),
    selectedIndex: row.selectedIndex,
    copied: row.copied === 1,
    downloaded: row.downloaded === 1,
    isSample: row.isSample === 1,
    createdAt: row.createdAt,
  };
}

export function saveGeneration(params: {
  type: GenerationType;
  input: unknown;
  options: unknown[];
  isSample: boolean;
}): GenerationRecord {
  const db = getDb();
  const row = {
    id: randomUUID(),
    type: params.type,
    input: JSON.stringify(params.input),
    options: JSON.stringify(params.options),
    selectedIndex: null,
    copied: 0,
    downloaded: 0,
    isSample: params.isSample ? 1 : 0,
    createdAt: Date.now(),
  };
  db.insert(schema.generations).values(row).run();
  return toRecord(row);
}

export function listGenerations(params: {
  type?: string;
  limit?: number;
}): GenerationRecord[] {
  const db = getDb();
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
  const isValidType = (generationTypeValues as readonly string[]).includes(params.type ?? "");
  let query = db.select().from(schema.generations).$dynamic();
  if (isValidType) {
    query = query.where(eq(schema.generations.type, params.type!));
  }
  const rows = query.orderBy(desc(schema.generations.createdAt)).limit(limit).all();
  return rows.map(toRecord);
}

export function getGeneration(id: string): GenerationRecord | null {
  const db = getDb();
  const row = db.select().from(schema.generations).where(eq(schema.generations.id, id)).get();
  return row ? toRecord(row) : null;
}

export function patchGeneration(id: string, patch: HistoryPatch): GenerationRecord | null {
  const db = getDb();
  const set: Partial<typeof schema.generations.$inferInsert> = {};
  if (patch.selectedIndex !== undefined) set.selectedIndex = patch.selectedIndex;
  if (patch.copied !== undefined) set.copied = patch.copied ? 1 : 0;
  if (patch.downloaded !== undefined) set.downloaded = patch.downloaded ? 1 : 0;
  db.update(schema.generations).set(set).where(eq(schema.generations.id, id)).run();
  return getGeneration(id);
}

export function deleteGeneration(id: string): boolean {
  const db = getDb();
  const result = db.delete(schema.generations).where(eq(schema.generations.id, id)).run();
  return result.changes > 0;
}
