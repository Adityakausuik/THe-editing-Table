/**
 * Shared YouTube utility functions for parsing, validating, and generating embed URLs.
 */

export function getYouTubeId(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  // If it's already an 11-character alphanumeric YouTube ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // youtu.be/<id>
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (shortMatch) return shortMatch[1];

  // youtube.com/watch?v=<id> or ?feature=...&v=<id>
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch) return watchMatch[1];

  // youtube.com/embed/<id>
  const embedMatch = trimmed.match(/youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
  if (embedMatch) return embedMatch[1];

  // youtube.com/shorts/<id>
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (shortsMatch) return shortsMatch[1];

  // youtube.com/v/<id>
  const vMatch = trimmed.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/i);
  if (vMatch) return vMatch[1];

  // youtube.com/live/<id>
  const liveMatch = trimmed.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/i);
  if (liveMatch) return liveMatch[1];

  return null;
}

export function isValidYouTubeUrl(url) {
  return Boolean(getYouTubeId(url));
}

export function getYouTubeEmbedUrl(urlOrId, options = {}) {
  const id = getYouTubeId(urlOrId);
  if (!id) return "";

  const {
    autoplay = 1,
    mute = 1,
    loop = 1,
    controls = 0,
    showinfo = 0,
    rel = 0,
    modestbranding = 1,
    playsinline = 1
  } = options;

  const params = new URLSearchParams({
    autoplay: String(autoplay),
    mute: String(mute),
    loop: String(loop),
    playlist: id,
    controls: String(controls),
    showinfo: String(showinfo),
    rel: String(rel),
    iv_load_policy: "3",
    disablekb: "1",
    modestbranding: String(modestbranding),
    playsinline: String(playsinline)
  });

  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

export function getYouTubeThumbnail(urlOrId, quality = "hqdefault") {
  const id = getYouTubeId(urlOrId);
  if (!id) return "";
  return `https://img.youtube.com/vi/${id}/${quality}.jpg`;
}
