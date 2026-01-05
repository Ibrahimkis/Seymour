// src/projectDb.ts
import { openDB, DBSchema } from "idb";

type AnyProject = any; // keep loose if you haven't typed the full schema yet

interface SeymourDB extends DBSchema {
  kv: {
    key: string; // "seymour_data" or "seymour_data_backup"
    value: AnyProject;
  };
}

const DB_NAME = "seymour_db";
const DB_VERSION = 1;

async function getDB() {
  return openDB<SeymourDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
    },
  });
}

export async function dbGet(key: string) {
  const db = await getDB();
  return (await db.get("kv", key)) ?? null;
}

export async function dbSet(key: string, value: AnyProject) {
  const db = await getDB();
  await db.put("kv", value, key);
}

export async function dbHas(key: string) {
  const db = await getDB();
  return (await db.get("kv", key)) != null;
}
