import mongoose from "mongoose";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Pool } from "@neondatabase/serverless";
import { env, isRemoteMongoUri } from "../src/config/env.js";
import { getBlobToken, isVercelBlobUrl, putVercelBlob } from "../src/utils/blobStorage.js";

const APPLY = process.argv.includes("--apply");
const MIGRATION_TARGET = process.env.MIGRATION_TARGET;
const MEDIA_TABLES = [
  "aboutmes", "adminactivitylogs", "blogposts", "brandcollaborations", "careerscontents",
  "contactemails", "contactoffices", "contactphones", "contactsettings", "enquiries",
  "heroslides", "jobs", "jobapplications", "partners", "photoshowcaseitems",
  "portfolioitems", "reviews", "services", "sitesettings", "teammembers", "videoanalytics",
  "users", "videoshowcaseitems", "videoshowcasesettings", "weddinggalleryitems", "workinghours"
];
const quote = (identifier) => `"${String(identifier).replaceAll('"', '""')}"`;
const normalize = (value) => String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");

export function validateMigrationTarget({ sourceUrl, targetUrl, previewDatabaseUrl, vercelEnv, migrationTarget, publicToken, privateToken, apply, confirmation, sourceWriteFreeze, postgresWriteFreeze, deployedFreezeConfirmation, mongoBackupConfirmation }) {
  if (!isRemoteMongoUri(sourceUrl) || !targetUrl) throw new Error("A remote MONGODB_URI source and explicit PostgreSQL target URL are required.");
  if (migrationTarget === "preview-staging") {
    if (vercelEnv !== "preview" || !previewDatabaseUrl || targetUrl !== previewDatabaseUrl) {
      throw new Error("Preview GridFS-to-Blob migration requires VERCEL_ENV=preview and the configured preview-staging PostgreSQL database.");
    }
  } else if (migrationTarget === "production") {
    if (vercelEnv !== "production" || !previewDatabaseUrl || targetUrl === previewDatabaseUrl) {
      throw new Error("Production GridFS-to-Blob migration requires VERCEL_ENV=production and a Production PostgreSQL URL distinct from PREVIEW_DATABASE_URL.");
    }
  } else {
    throw new Error("MIGRATION_TARGET must be exactly preview-staging or production.");
  }
  if (!publicToken || !privateToken) throw new Error("Both public and private Vercel Blob tokens are required for the backfill.");
  if (apply && deployedFreezeConfirmation !== migrationTarget) {
    throw new Error(`Blob backfill requires the application-level read-only deployment to be active; set CONFIRM_DEPLOYED_WRITE_FREEZE=${migrationTarget} only after verifying MIGRATION_WRITE_FREEZE=true on the target deployment.`);
  }
  if (apply && sourceWriteFreeze !== migrationTarget) {
    throw new Error(`Blob backfill requires a confirmed MongoDB application write freeze; set CONFIRM_MONGODB_WRITE_FREEZE=${migrationTarget} during the maintenance window.`);
  }
  if (apply && postgresWriteFreeze !== migrationTarget) {
    throw new Error(`Blob backfill requires a confirmed ${migrationTarget} PostgreSQL application write freeze; set CONFIRM_POSTGRES_WRITE_FREEZE=${migrationTarget} during the maintenance window.`);
  }
  if (apply && confirmation !== migrationTarget) {
    throw new Error(`Set CONFIRM_GRIDFS_BLOB_MIGRATION=${migrationTarget} with --apply to authorize the backfill.`);
  }
  if (apply && migrationTarget === "production" && mongoBackupConfirmation !== "production") {
    throw new Error("Production Blob backfill requires a verified, current MongoDB Atlas backup; set CONFIRM_MONGODB_BACKUP=production only after verifying the backup restore point.");
  }
}

export function replaceMappedStrings(value, replacements) {
  if (typeof value === "string") {
    let result = value;
    for (const [source, target] of replacements) result = result.split(source).join(target);
    return result;
  }
  if (Array.isArray(value)) return value.map((item) => replaceMappedStrings(item, replacements));
  if (value && typeof value === "object" && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceMappedStrings(item, replacements)]));
  }
  return value;
}

function requireSafeTarget() {
  const sourceUrl = process.env.MONGODB_URI?.trim();
  const targetUrl = env.DATABASE_URL?.trim();
  validateMigrationTarget({
    sourceUrl,
    targetUrl,
    previewDatabaseUrl: env.PREVIEW_DATABASE_URL?.trim(),
    vercelEnv: env.VERCEL_ENV,
    migrationTarget: MIGRATION_TARGET,
    publicToken: getBlobToken("public"),
    privateToken: getBlobToken("private"),
    apply: APPLY,
    confirmation: process.env.CONFIRM_GRIDFS_BLOB_MIGRATION,
    sourceWriteFreeze: process.env.CONFIRM_MONGODB_WRITE_FREEZE,
    postgresWriteFreeze: process.env.CONFIRM_POSTGRES_WRITE_FREEZE,
    deployedFreezeConfirmation: process.env.CONFIRM_DEPLOYED_WRITE_FREEZE,
    mongoBackupConfirmation: process.env.CONFIRM_MONGODB_BACKUP
  });
  return targetUrl;
}

function readGridFsFile(bucket, id) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = bucket.openDownloadStream(id);
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.once("error", reject);
    stream.once("end", () => resolve(Buffer.concat(chunks)));
  });
}

export function objectPath(file) {
  const sourceName = normalize(file.filename);
  const ext = path.extname(sourceName).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 13);
  const privateFile = sourceName.split("/")[0].toLowerCase() === "resumes";
  return { access: privateFile ? "private" : "public", pathname: `migration/${privateFile ? "private" : "public"}/${file._id}${ext}` };
}

export function gridFsPathForUploadUrl(value) {
  const raw = String(value || "");
  let pathname = raw;
  try {
    pathname = new URL(raw, "https://migration.invalid").pathname;
  } catch {
    // Keep the original string for simple relative upload paths.
  }
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    // Preserve invalid encodings so the preflight reports the unresolved path.
  }
  return normalize(pathname.replace(/^\/api\/uploads\//, "").replace(/^\/uploads\//, "").replace(/^uploads\//, ""));
}

export function collectUploadUrlAliases(value) {
  const aliases = new Set();
  const knownHosts = new Set([
    "theeditingtable.com",
    "www.theeditingtable.com",
    "t-he-editing-table-client.vercel.app",
    "t-he-editing-table-server.vercel.app",
    "localhost",
    "127.0.0.1",
    "[::1]"
  ]);
  for (const origin of [env.CLIENT_URL, env.CLIENT_ORIGIN, process.env.VERCEL_URL].filter(Boolean)) {
    try {
      knownHosts.add(new URL(origin.includes("://") ? origin : `https://${origin}`).hostname.toLowerCase());
    } catch {
      // Ignore malformed optional deployment host values.
    }
  }
  function visit(current) {
    if (typeof current === "string") {
      if (/^https?:\/\//i.test(current) && !/\/api\/uploads\/|\/uploads\//i.test(current)) return;
      const matches = current.match(/(?:https?:\/\/[^/\s"'<>]+)?\/(?:api\/)?uploads\/[^\s"'<>?#]+/gi) || [];
      for (const rawMatch of matches) {
        const match = rawMatch.replace(/[),.;]+$/, "");
        if (/^https?:\/\//i.test(match)) {
          let hostname;
          try {
            hostname = new URL(match).hostname.toLowerCase();
          } catch {
            continue;
          }
          const ownedVercelAlias = hostname.endsWith(".vercel.app") && /t-he-editing-table|the-editing-table/i.test(hostname);
          if (!knownHosts.has(hostname) && !ownedVercelAlias) continue;
        }
        aliases.add(match);
      }
      return;
    }
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (current && typeof current === "object" && !(current instanceof Date) && !Buffer.isBuffer(current)) {
      Object.values(current).forEach(visit);
    }
  }
  visit(value);
  return [...aliases];
}

async function loadModels() {
  const modelDirectory = new URL("../src/models/", import.meta.url);
  const files = (await fs.readdir(modelDirectory)).filter((file) => file.endsWith(".model.js")).sort();
  for (const file of files) await import(new URL(file, modelDirectory).href);
  return mongoose.modelNames().map((name) => mongoose.model(name));
}

async function assertPostgresImportReady(pool, models, mongoDb) {
  const schema = await pool.query("SELECT 1 FROM schema_migrations WHERE version = $1 LIMIT 1", ["0001_initial_postgres_schema"]);
  if (!schema.rowCount) throw new Error("PostgreSQL schema import is incomplete; run the Mongo-to-PostgreSQL migration first.");
  const result = await pool.query("SELECT source_collection, migrated_count, status FROM migration_runs ORDER BY source_collection");
  const runs = new Map(result.rows.map((row) => [row.source_collection, row]));
  const discrepancies = [];
  for (const model of models) {
    const collection = model.collection.collectionName;
    const run = runs.get(collection);
    if (!run || run.status !== "completed") {
      discrepancies.push(`${collection}: migration status is ${run?.status || "missing"}`);
      continue;
    }
    const count = await pool.query(`SELECT count(*)::bigint AS count FROM ${quote(collection)}`);
    const sourceCollection = mongoDb.collection(collection);
    const sourceCount = await sourceCollection.countDocuments();
    if (BigInt(count.rows[0]?.count || 0) !== BigInt(run.migrated_count) || sourceCount !== Number(run.migrated_count)) {
      discrepancies.push(`${collection}: target count differs from the last completed import`);
      continue;
    }
    let batch = [];
    async function verifyIds() {
      if (!batch.length) return true;
      const expected = batch;
      batch = [];
      const present = await pool.query(`SELECT "_id" FROM ${quote(collection)} WHERE "_id" = ANY($1::text[])`, [expected]);
      return present.rowCount === expected.length;
    }
    const cursor = sourceCollection.find({}, { projection: { _id: 1 } }).sort({ _id: 1 }).batchSize(1000);
    let idsMatch = true;
    for await (const document of cursor) {
      batch.push(String(document._id));
      if (batch.length === 1000 && !await verifyIds()) idsMatch = false;
    }
    if (!await verifyIds()) idsMatch = false;
    if (!idsMatch) discrepancies.push(`${collection}: source and target IDs differ`);

    if (model.schema.options.timestamps) {
      const latestSource = await sourceCollection.findOne({ updatedAt: { $ne: null } }, { projection: { updatedAt: 1 }, sort: { updatedAt: -1 } });
      if (latestSource?.updatedAt) {
        const latestTarget = await pool.query(`SELECT max("updated_at") AS latest FROM ${quote(collection)}`);
        if (!latestTarget.rows[0]?.latest || new Date(latestTarget.rows[0].latest) < new Date(latestSource.updatedAt)) {
          discrepancies.push(`${collection}: source has updates newer than the completed PostgreSQL import`);
        }
      }
    }
  }
  if (discrepancies.length) {
    throw new Error(`PostgreSQL import preflight failed; no Blob uploads were started. ${discrepancies.join("; ")}`);
  }
  return models.length;
}

export function findUnmigratedUploadReferences({ mediaRows, applicationRows, contentReferences = [], gridFsPaths }) {
  const sourcePaths = gridFsPaths instanceof Set ? gridFsPaths : new Set(gridFsPaths);
  const missing = new Set();
  const addCandidate = (value, label) => {
    if (!value || isVercelBlobUrl(value)) return;
    const candidate = gridFsPathForUploadUrl(String(value).replace(/[),.;]+$/, ""));
    if (candidate && !sourcePaths.has(candidate)) missing.add(`${label}:${candidate}`);
  };
  for (const row of mediaRows) {
    if (isVercelBlobUrl(row.url)) continue;
    const aliases = collectUploadUrlAliases(row.url);
    if (aliases.length) aliases.forEach((alias) => addCandidate(alias, "media"));
    else if (row.path && !/^https?:\/\//i.test(String(row.url || "")) && !sourcePaths.has(normalize(row.path))) {
      addCandidate(row.path, "media-path");
    }
  }
  for (const row of applicationRows) {
    for (const alias of collectUploadUrlAliases(row.resume_url)) addCandidate(alias, "resume");
  }
  for (const row of contentReferences) {
    for (const alias of collectUploadUrlAliases(row.value)) {
      addCandidate(alias, row.label || `${row.table || "content"}.${row.column || "field"}:${row.id || "record"}`);
    }
  }
  return [...missing].sort();
}

export async function listPostgresUploadContentReferences(pool) {
  const columns = await pool.query(
    `SELECT table_name, column_name FROM information_schema.columns ` +
      `WHERE table_schema = 'public' AND table_name = ANY($1::text[]) ` +
      `AND data_type IN ('text', 'character varying', 'jsonb') ORDER BY table_name, ordinal_position`,
    [MEDIA_TABLES]
  );
  const references = [];
  for (const { table_name: table, column_name: column } of columns.rows) {
    let lastId = null;
    while (true) {
      const result = await pool.query(
        `SELECT "_id" AS id, ${quote(column)} AS value FROM ${quote(table)} ` +
          `WHERE ${quote(column)} IS NOT NULL AND ${quote(column)}::text ILIKE '%/uploads/%' ` +
          `${lastId === null ? "" : 'AND "_id" > $1 '}ORDER BY "_id" LIMIT ${lastId === null ? "250" : "$2"}`,
        lastId === null ? [] : [lastId, 250]
      );
      if (!result.rows.length) break;
      references.push(...result.rows.map((row) => ({ table, column, id: String(row.id), value: row.value })));
      lastId = String(result.rows.at(-1).id);
    }
  }
  return references;
}

function aliasesFor(filename, databaseUrls = []) {
  const clean = normalize(filename);
  return new Set([
    `/uploads/${clean}`,
    `/api/uploads/${clean}`,
    ...databaseUrls.filter(Boolean).map(String)
  ]);
}

async function updateMediaMetadata(client, sourceFilename, blob, existingMediaUrls = []) {
  const oldPath = normalize(sourceFilename);
  const basename = oldPath.split("/").pop();
  await client.query(
    `UPDATE "media" SET "filename" = $1, "url" = $2, "path" = $3, "mime_type" = $4, "size" = $5, "updated_at" = now() ` +
      `WHERE "path" = $6 OR "path" = $9 OR ("filename" = $7 AND "url" = ANY($8::text[]))`,
    [blob.pathname.split("/").pop(), blob.url, blob.pathname, blob.contentType || "application/octet-stream", blob.size, oldPath, basename,
      [...new Set([...aliasesFor(oldPath), ...existingMediaUrls])], blob.pathname]
  );
}

async function rewriteReferences(client, replacementPairs) {
  const orderedReplacements = [...replacementPairs].sort((left, right) => right[0].length - left[0].length);
  const columns = await client.query(
    `SELECT table_name, column_name, data_type FROM information_schema.columns ` +
      `WHERE table_schema = 'public' AND table_name = ANY($1::text[]) AND data_type IN ('text', 'character varying', 'jsonb') ` +
      `ORDER BY table_name, ordinal_position`,
    [MEDIA_TABLES]
  );
  let updatedCells = 0;
  for (const { table_name: table, column_name: column, data_type: type } of columns.rows) {
    const result = await client.query(
      `SELECT "_id" AS id, ${quote(column)} AS value FROM ${quote(table)} WHERE ${quote(column)} IS NOT NULL`
    ).catch((error) => {
      if (error.code === "42703") return { rows: [] };
      throw error;
    });
    for (const row of result.rows) {
      const next = replaceMappedStrings(row.value, orderedReplacements);
      if (JSON.stringify(next) === JSON.stringify(row.value)) continue;
      await client.query(
        `UPDATE ${quote(table)} SET ${quote(column)} = $1${type === "jsonb" ? "::jsonb" : ""} WHERE "_id" = $2`,
        [type === "jsonb" ? JSON.stringify(next) : next, row.id]
      );
      updatedCells += 1;
    }
  }
  return updatedCells;
}

async function main() {
  const targetUrl = requireSafeTarget();
  const pool = new Pool({ connectionString: targetUrl, max: 2, connectionTimeoutMillis: 10_000 });
  let connectedMongo = false;
  try {
    await mongoose.connect(process.env.MONGODB_URI.trim(), { serverSelectionTimeoutMS: 10_000 });
    connectedMongo = true;
    const mongoDb = mongoose.connection.db;
    const models = await loadModels();
    const importedCollections = await assertPostgresImportReady(pool, models, mongoDb);
    const mediaCount = await pool.query(`SELECT count(*)::int AS count FROM "media"`);
    const gridFsBucket = new mongoose.mongo.GridFSBucket(mongoDb, { bucketName: "media_uploads" });
    const files = await gridFsBucket.find({}).toArray();
    const gridFsPaths = new Set(files.map((file) => normalize(file.filename)));
    const mediaRows = await pool.query(`SELECT "path", "url" FROM "media"`);
    const applicationRows = await pool.query(`SELECT "resume__url" AS resume_url FROM "jobapplications" WHERE "resume__url" IS NOT NULL`);
    const contentReferences = await listPostgresUploadContentReferences(pool);
    const missingReferences = findUnmigratedUploadReferences({ mediaRows: mediaRows.rows, applicationRows: applicationRows.rows, contentReferences, gridFsPaths });
    if (missingReferences.length) {
      throw new Error(`GridFS source files are missing for referenced Preview uploads; no Blob uploads were started. ${missingReferences.slice(0, 25).join("; ")}`);
    }
    const mediaUrlsByPath = new Map();
    for (const row of mediaRows.rows) {
      const key = normalize(row.path);
      const urls = mediaUrlsByPath.get(key) || [];
      urls.push(row.url);
      mediaUrlsByPath.set(key, urls);
    }
    const seenNames = new Set();
    for (const file of files) {
      const path = normalize(file.filename);
      if (seenNames.has(path)) throw new Error(`Duplicate GridFS filename prevents an unambiguous URL migration: ${path}`);
      seenNames.add(path);
    }
    const uploadAliasesByPath = new Map();
    for (const row of contentReferences) {
      for (const alias of collectUploadUrlAliases(row.value)) {
        const sourcePath = gridFsPathForUploadUrl(alias);
        const aliases = uploadAliasesByPath.get(sourcePath) || new Set();
        aliases.add(alias);
        uploadAliasesByPath.set(sourcePath, aliases);
      }
    }
    console.info(`[asset-migration] target=${MIGRATION_TARGET} mode=${APPLY ? "apply" : "dry-run"} collections=${importedCollections} gridfsFiles=${files.length} mediaRows=${mediaCount.rows[0].count}`);
    if (!APPLY) {
      console.info("Dry run complete. No Blob objects or PostgreSQL rows were changed. Use --apply only after reviewing this count.");
      return;
    }

    const replacements = [];
    const metadataUpdates = [];
    let uploaded = 0;
    for (const file of files) {
      const buffer = await readGridFsFile(gridFsBucket, file._id);
      if (buffer.length !== file.length) throw new Error(`GridFS byte count mismatch for ${file.filename}.`);
      const { access, pathname } = objectPath(file);
      const blob = await putVercelBlob(pathname, buffer, {
        access,
        contentType: file.contentType || file.metadata?.mimeType || "application/octet-stream",
        multipart: buffer.length > 5 * 1024 * 1024,
        addRandomSuffix: false,
        allowOverwrite: true
      });
      const oldUrls = aliasesFor(file.filename, [
        ...(mediaUrlsByPath.get(normalize(file.filename)) || []),
        ...(mediaUrlsByPath.get(pathname) || []),
        ...(uploadAliasesByPath.get(path) || [])
      ]);
      for (const oldUrl of oldUrls) replacements.push([oldUrl, blob.url]);
      metadataUpdates.push({ filename: file.filename, blob, oldUrls });
      uploaded += 1;
      if (uploaded % 25 === 0) console.info(`[asset-migration] copied ${uploaded}/${files.length}`);
    }

    const client = await pool.connect();
    let updatedCells;
    try {
      await client.query("BEGIN");
      for (const item of metadataUpdates) await updateMediaMetadata(client, item.filename, item.blob, item.oldUrls);
      updatedCells = await rewriteReferences(client, replacements);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
    console.info(`[asset-migration] copied=${uploaded} referenceCellsUpdated=${updatedCells}`);
    console.info(`GridFS source files were preserved; this process only created Blob objects and updated ${MIGRATION_TARGET} PostgreSQL.`);
  } finally {
    if (connectedMongo) await mongoose.disconnect().catch(() => {});
    await pool.end().catch(() => {});
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`[asset-migration] ${error.message}`);
    process.exitCode = 1;
  });
}
