// scripts/lib/data-core.mjs の型定義。
// テスト（src/lib/*.test.ts）が data/ から db を組み立てるために import する。
import type { Db, Era, EntitySource, Work, WorkId } from '../../src/types'

export interface RawPack {
  workId: WorkId
  file: string
  entities: EntitySource[]
  isArray: boolean
}

export interface Raw {
  root: string
  meta: { dataVersion?: string; updatedAt?: string }
  changelog: string
  works: Work[]
  eras: Era[]
  packs: RawPack[]
  errors: { file: string; message: string }[]
}

/** 結合後の内部表現。db.json に書くときは buildDb が内部フィールドを落とす */
export interface Merged {
  map: Map<string, Record<string, unknown> & { id: string }>
  definitions: Map<string, WorkId[]>
  order: Map<WorkId, number>
  packs: RawPack[]
  conflicts: { a: string; b: string; aList: WorkId[]; bList: WorkId[] }[]
}

export function loadRaw(root: string): Raw
export function mergeEntities(raw: Raw): Merged
export function buildDb(raw: Raw, merged: Merged): Db

export function parseLinks(text: string): { id: string; label: string | null; raw: string }[]
export function normalizeReleaseDate(d: string): string
export function publishOrderMap(works: Work[]): Map<WorkId, number>
export function checkShape(value: unknown, spec: unknown, path?: string): string[]

export const LINK_RE: RegExp
export const ENTITY_TYPES: string[]
export const ENTITY_SPEC: unknown
export const WORK_SPEC: unknown
export const ERA_SPEC: unknown
