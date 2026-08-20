const unsafeKeyPattern = /(^\$)|\./;

function findUnsafeKey(value, path = "request") {
  if (!value || typeof value !== "object") return "";

  for (const [key, child] of Object.entries(value)) {
    if (unsafeKeyPattern.test(key)) return `${path}.${key}`;
    const nested = findUnsafeKey(child, `${path}.${key}`);
    if (nested) return nested;
  }

  return "";
}

export function rejectUnsafeInput(req, res, next) {
  const unsafePath =
    findUnsafeKey(req.body, "body") ||
    findUnsafeKey(req.params, "params") ||
    findUnsafeKey(req.query, "query");

  if (unsafePath) {
    return res.status(400).json({
      success: false,
      message: `Unsafe request field rejected: ${unsafePath}`,
      data: null
    });
  }

  return next();
}
