// schema.js — SQLite local database replaced by Supabase cloud.
// This file is kept as a no-op stub so App.js doesn't need changes.
// All schema creation and seed data is managed directly in Supabase.

export const initDatabase = async () => {
  // No-op: Supabase is the data layer — no local init needed.
  return Promise.resolve();
};
