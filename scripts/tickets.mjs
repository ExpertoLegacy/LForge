#!/usr/bin/env node
// Manage entrance tickets stored in NOTEBOOKS_KV. Defaults to the local
// preview store; pass --remote to change production.
//
//   node scripts/tickets.mjs add --label "Grade 7 team" --days 3 [--remote]
//   node scripts/tickets.mjs add --label "Owner" [--stdin] [--remote]
//   node scripts/tickets.mjs list [--remote]
//   node scripts/tickets.mjs revoke <ticket-id> [--remote]
//
// `add` generates a code and prints it once; only its hash is stored. With
// --stdin it reads the code from standard input instead. Omitting --days makes
// a ticket that never expires. Timed tickets start counting on first use.
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

const PREFIX = "ticket:";
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    label: { type: "string" },
    days: { type: "string" },
    stdin: { type: "boolean", default: false },
    remote: { type: "boolean", default: false },
  },
});
const location = values.remote ? "--remote" : "--local";

function wrangler(...args) {
  return execFileSync(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "kv",
      "key",
      ...args,
      "--binding",
      "NOTEBOOKS_KV",
      location,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
}

function readRecord(id) {
  return JSON.parse(wrangler("get", `${PREFIX}${id}`, "--text"));
}

function writeRecord(id, record) {
  const dir = mkdtempSync(join(tmpdir(), "lf-ticket-"));
  try {
    const file = join(dir, "record.json");
    writeFileSync(file, JSON.stringify(record));
    wrangler("put", `${PREFIX}${id}`, "--path", file);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function describe(record) {
  if (record.revoked) return "revoked";
  if (record.expiresAt) return `expires ${record.expiresAt}`;
  return record.durationDays ? `unused, ${record.durationDays} days` : "no expiry";
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const [command, argument] = positionals;

if (command === "add") {
  if (!values.label) fail("--label is required.");
  const days = values.days === undefined ? null : Number(values.days);
  if (days !== null && !(days > 0)) fail("--days must be a positive number.");
  const code = values.stdin
    ? readFileSync(0, "utf8").trim()
    : randomBytes(12).toString("base64url");
  if (code.length < 8) fail("Ticket codes must be at least 8 characters.");
  const id = createHash("sha256").update(code).digest("hex");
  writeRecord(id, {
    label: values.label,
    durationDays: days,
    createdAt: new Date().toISOString(),
  });
  console.log(`Ticket id: ${id}`);
  if (!values.stdin) console.log(`Ticket code (shown once): ${code}`);
} else if (command === "list") {
  const keys = JSON.parse(wrangler("list", "--prefix", PREFIX));
  for (const { name } of keys) {
    const id = name.slice(PREFIX.length);
    const record = readRecord(id);
    console.log(`${id}  ${record.label}  (${describe(record)})`);
  }
} else if (command === "revoke") {
  if (!argument) fail("Pass the ticket id shown by `list`.");
  writeRecord(argument, { ...readRecord(argument), revoked: true });
  console.log(`Revoked ${argument}`);
} else {
  fail("Usage: node scripts/tickets.mjs <add|list|revoke> [--remote]");
}
