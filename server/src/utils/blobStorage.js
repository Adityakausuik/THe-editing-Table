const PUBLIC_TOKEN_NAME = "BLOB_READ_WRITE_TOKEN";
const PRIVATE_TOKEN_NAME = "BLOB_PRIVATE_READ_WRITE_TOKEN";

export function getBlobAccess(url) {
  return String(url || "").includes(".private.blob.vercel-storage.com") ? "private" : "public";
}

export function isVercelBlobUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && /\.(public|private)\.blob\.vercel-storage\.com$/.test(parsed.hostname);
  } catch {
    return false;
  }
}

export function getBlobToken(access = "public") {
  const tokenName = access === "private" ? PRIVATE_TOKEN_NAME : PUBLIC_TOKEN_NAME;
  return process.env[tokenName] || "";
}

export function isBlobStorageConfigured(access = "public") {
  return Boolean(getBlobToken(access));
}

function requireBlobToken(access) {
  const token = getBlobToken(access);
  if (!token) {
    const error = new Error(`Vercel Blob ${access} storage is not configured.`);
    error.code = "BLOB_STORAGE_NOT_CONFIGURED";
    error.status = 503;
    throw error;
  }
  return token;
}

export async function putVercelBlob(pathname, body, { access = "public", contentType, multipart = false, addRandomSuffix = true, allowOverwrite = false } = {}) {
  const token = requireBlobToken(access);
  const { put } = await import("@vercel/blob");
  return put(pathname, body, {
    access,
    token,
    contentType,
    multipart,
    addRandomSuffix,
    allowOverwrite,
    cacheControlMaxAge: access === "public" ? 31_536_000 : 60
  });
}

export async function getVercelBlob(url, access = "private") {
  const token = requireBlobToken(access);
  const { get } = await import("@vercel/blob");
  return get(url, { access, token });
}

export async function deleteVercelBlob(url) {
  if (!isVercelBlobUrl(url)) return false;
  const access = getBlobAccess(url);
  const token = requireBlobToken(access);
  const { del } = await import("@vercel/blob");
  await del(url, { token });
  return true;
}
