import { getCloudflareContext } from "@opennextjs/cloudflare";

export type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  all<T = Record<string, unknown>>(): Promise<{ results: T[]; success?: boolean; meta?: Record<string, unknown> }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ success?: boolean; meta?: { last_row_id?: number | string; changes?: number }; error?: string }>;
};

export type D1Database = {
  prepare(query: string): D1Statement;
};

export function getBBMSiagaDB(): D1Database {
  const { env } = getCloudflareContext();
  return (env as unknown as { DB: D1Database }).DB;
}
