import mongoose from "mongoose";
import { env } from "./env.js";
import { isPostgresSelected } from "./databaseMode.js";

let gridFsConnection = null;
let pendingConnection = null;

function identifiesSameMongoDatabase(left, right) {
  if (!left || !right) return false;
  try {
    const first = new URL(left);
    const second = new URL(right);
    return first.protocol === second.protocol &&
      first.hostname.toLowerCase() === second.hostname.toLowerCase() &&
      first.pathname.replace(/\/$/, "") === second.pathname.replace(/\/$/, "");
  } catch {
    return false;
  }
}

function getGridFsUri() {
  if (env.VERCEL_ENV === "preview") {
    const previewUri = env.PREVIEW_GRIDFS_MONGODB_URI;
    const productionUri = env.GRIDFS_MONGODB_URI || env.MONGODB_URI;
    if (identifiesSameMongoDatabase(previewUri, productionUri)) return null;
    return previewUri || null;
  }
  if (isPostgresSelected()) return env.GRIDFS_MONGODB_URI || env.MONGODB_URI || null;
  return env.MONGODB_URI || null;
}

export function isGridFsConfigured() {
  return Boolean(getGridFsUri());
}

export function getGridFsConnection() {
  if (!isPostgresSelected() && env.VERCEL_ENV !== "preview") return mongoose.connection;
  return gridFsConnection;
}

export function isGridFsConnected() {
  const connection = getGridFsConnection();
  return Boolean(connection?.readyState === 1 && connection.db);
}

export async function connectGridFs() {
  // The default Mongoose connection owns application models in Mongo mode.
  // PostgreSQL mode uses a separate connection exclusively for file bytes.
  if (!isPostgresSelected() && env.VERCEL_ENV !== "preview") {
    return mongoose.connection.readyState === 1 ? mongoose.connection : null;
  }

  const uri = getGridFsUri();
  if (!uri) return null;
  if (gridFsConnection?.readyState === 1) return gridFsConnection;
  if (pendingConnection) return pendingConnection;

  gridFsConnection ??= mongoose.createConnection();
  const isSrv = uri.startsWith("mongodb+srv://");
  pendingConnection = gridFsConnection.openUri(uri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    bufferCommands: false,
    ...(isSrv ? { tlsAllowInvalidCertificates: true } : {})
  }).then(() => gridFsConnection).catch((error) => {
    pendingConnection = null;
    throw error;
  }).finally(() => {
    if (gridFsConnection?.readyState === 1) pendingConnection = null;
  });

  return pendingConnection;
}
