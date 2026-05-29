#!/usr/bin/env node
// Sovereign Dispatch — migration runner (R1).
//
// Forward-only, tracked, idempotent application of db/migrations/*.sql in the
// canonical order declared in db/migrations/manifest.json. Dispatch owns its
// schema lifecycle independently of any host platform's migration tooling
// (e.g. Lovable/Supabase dashboard) — this is the prerequisite for archiving
// Polished Pages without losing the ability to provision the Dispatch schema.
//
// Uses `psql` only (no Node DB driver), so it runs anywhere psql exists and
// needs no npm install. Each migration is applied in a single transaction
// (`psql -1 -v ON_ERROR_STOP=1`) and recorded with its SHA-256 in
// public._dispatch_migrations. Re-running is a no-op for already-applied files;
// a changed checksum on an applied file is reported as drift and aborts.
//
// Usage:
//   node db/migrate.mjs status            # show applied / pending
//   node db/migrate.mjs up                # apply pending migrations
//   node db/migrate.mjs up --seed         # also apply db/seed/*.sql (DEV ONLY)
//
// Connection (first defined wins):
//   DISPATCH_MIGRATE_URL   admin/owner DSN with DDL + CREATE ROLE privileges
//   ADMIN_DATABASE_URL
//   DATABASE_URL
//
// Exit codes: 0 ok, 1 usage/connection error, 2 migration failure, 3 drift.

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(HERE, "migrations");
const SEED_DIR = join(HERE, "seed");
const MANIFEST = join(MIGRATIONS_DIR, "manifest.json");

const DSN =
  process.env.DISPATCH_MIGRATE_URL ||
  process.env.ADMIN_DATABASE_URL ||
  process.env.DATABASE_URL;

function die(code, msg) {
  console.error(`migrate: ${msg}`);
  process.exit(code);
}

function psql(args, input) {
  return execFileSync("psql", [DSN, "-v", "ON_ERROR_STOP=1", ...args], {
    input: input ?? undefined,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "inherit"],
  });
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function plannedOrder() {
  if (existsSync(MANIFEST)) {
    const m = JSON.parse(readFileSync(MANIFEST, "utf8"));
    if (Array.isArray(m.order) && m.order.length) return m.order;
  }
  // Fallback: lexical order of M*.sql (only safe if no cross-file ordering deps).
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^M.*\.sql$/.test(f))
    .sort();
}

function ensureTrackingTable() {
  psql(
    ["-q", "-f", "-"],
    `create table if not exists public._dispatch_migrations (
       name text primary key,
       checksum text not null,
       applied_at timestamptz not null default now()
     );`,
  );
}

function appliedMap() {
  const out = psql(["-Atq", "-c", "select name||'\t'||checksum from public._dispatch_migrations"]);
  const map = new Map();
  for (const line of out.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const [name, checksum] = line.split("\t");
    map.set(name, checksum);
  }
  return map;
}

function readMigration(name) {
  const path = join(MIGRATIONS_DIR, name);
  if (!existsSync(path)) die(2, `migration file missing: ${name}`);
  const sql = readFileSync(path, "utf8");
  return { path, sql, checksum: sha256(sql) };
}

function cmdStatus() {
  ensureTrackingTable();
  const applied = appliedMap();
  const order = plannedOrder();
  console.log("Sovereign Dispatch — migration status");
  console.log(`DSN: ${DSN.replace(/:[^:@/]*@/, ":***@")}`);
  let pending = 0;
  for (const name of order) {
    const { checksum } = readMigration(name);
    if (!applied.has(name)) {
      console.log(`  [ pending ] ${name}`);
      pending++;
    } else if (applied.get(name) !== checksum) {
      console.log(`  [ DRIFT!  ] ${name} (checksum changed since apply)`);
    } else {
      console.log(`  [ applied ] ${name}`);
    }
  }
  console.log(`${pending} pending, ${applied.size} applied.`);
}

function cmdUp(withSeed) {
  ensureTrackingTable();
  const applied = appliedMap();
  const order = plannedOrder();
  let count = 0;
  for (const name of order) {
    const { path, checksum } = readMigration(name);
    if (applied.has(name)) {
      if (applied.get(name) !== checksum) {
        die(3, `drift: ${name} changed after being applied (forward-only migrations are immutable)`);
      }
      continue;
    }
    process.stdout.write(`applying ${name} ... `);
    try {
      psql(["-1", "-q", "-f", path]); // -1 => whole file in one transaction
    } catch (e) {
      console.log("FAILED");
      die(2, `migration failed: ${name}`);
    }
    psql(
      ["-q", "-c", `insert into public._dispatch_migrations (name, checksum) values ('${name}', '${checksum}')`],
    );
    console.log("ok");
    count++;
  }
  if (withSeed) applySeed();
  console.log(count === 0 ? "already up to date." : `applied ${count} migration(s).`);
}

function applySeed() {
  if (!existsSync(SEED_DIR)) return;
  const seeds = readdirSync(SEED_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const s of seeds) {
    process.stdout.write(`seeding ${s} ... `);
    psql(["-1", "-q", "-f", join(SEED_DIR, s)]);
    console.log("ok");
  }
}

function main() {
  if (!DSN) die(1, "no connection string (set DISPATCH_MIGRATE_URL / ADMIN_DATABASE_URL / DATABASE_URL)");
  const cmd = process.argv[2] || "status";
  const withSeed = process.argv.includes("--seed");
  if (cmd === "status") return cmdStatus();
  if (cmd === "up") return cmdUp(withSeed);
  die(1, `unknown command '${cmd}' (use: status | up [--seed])`);
}

main();
