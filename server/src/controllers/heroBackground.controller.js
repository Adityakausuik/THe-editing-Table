import {
  deleteHeroBackgroundVersion,
  getActiveHeroBackground,
  getAdminHeroBackground,
  getHeroBackgroundById,
  listHeroBackgroundHistory,
  publishHeroBackground,
  removeAssetFromDraft,
  restoreHeroBackgroundVersion,
  saveHeroBackgroundDraft,
  unpublishHeroBackground
} from "../db/heroBackgroundRepository.js";
import { saveHeroAsset } from "../middleware/heroVideoUpload.js";
import { writeSecurityAudit } from "../utils/audit.js";
import { getCache, setCache, deleteCache, invalidateCmsCache } from "../config/redis.js";

/**
 * Public: Get current active published hero background.
 */
export async function getActiveHeroVideo(req, res, next) {
  try {
    const cacheKey = "cms:hero:video:active";
    const cached = await getCache(cacheKey);
    if (cached && Object.prototype.hasOwnProperty.call(cached, "active")) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      return res.json({ success: true, data: cached.active });
    }

    const active = await getActiveHeroBackground();
    await setCache(cacheKey, { active: active || null }, 300);
    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    return res.json({
      success: true,
      data: active
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin: Get current draft and active configurations.
 */
export async function getAdminHeroConfig(req, res, next) {
  try {
    const data = await getAdminHeroBackground();
    return res.json({
      success: true,
      data
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin: Upload desktop background video asset.
 */
export async function uploadDesktopVideoAsset(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No video file provided." });
    }

    const saved = await saveHeroAsset(req.file, "desktop");
    const adminState = await getAdminHeroBackground();
    const currentDraft = adminState.draft || adminState.active || {};

    const updatedDraft = await saveHeroBackgroundDraft(
      {
        ...currentDraft,
        videoUrl: saved.url,
        videoType: saved.mimeType || "video/mp4",
        fileMetadata: {
          ...(currentDraft.fileMetadata || {}),
          desktop: {
            filename: saved.filename,
            originalName: saved.originalName,
            size: saved.size,
            mimeType: saved.mimeType,
            format: saved.format,
            uploadedAt: new Date().toISOString()
          }
        }
      },
      req.user
    );

    await writeSecurityAudit({
      req,
      user: req.user,
      action: "HERO_VIDEO_UPLOAD_DESKTOP",
      entity: "HeroBackgroundVideo",
      entityId: updatedDraft.id,
      details: { filename: saved.filename, size: saved.size, format: saved.format }
    });

    return res.status(201).json({
      success: true,
      message: "Desktop background video uploaded successfully.",
      data: {
        asset: saved,
        draft: updatedDraft
      }
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin: Upload mobile background video asset.
 */
export async function uploadMobileVideoAsset(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No mobile video file provided." });
    }

    const saved = await saveHeroAsset(req.file, "mobile");
    const adminState = await getAdminHeroBackground();
    const currentDraft = adminState.draft || adminState.active || {};

    const updatedDraft = await saveHeroBackgroundDraft(
      {
        ...currentDraft,
        mobileVideoUrl: saved.url,
        fileMetadata: {
          ...(currentDraft.fileMetadata || {}),
          mobile: {
            filename: saved.filename,
            originalName: saved.originalName,
            size: saved.size,
            mimeType: saved.mimeType,
            format: saved.format,
            uploadedAt: new Date().toISOString()
          }
        }
      },
      req.user
    );

    await writeSecurityAudit({
      req,
      user: req.user,
      action: "HERO_VIDEO_UPLOAD_MOBILE",
      entity: "HeroBackgroundVideo",
      entityId: updatedDraft.id,
      details: { filename: saved.filename, size: saved.size, format: saved.format }
    });

    return res.status(201).json({
      success: true,
      message: "Mobile background video uploaded successfully.",
      data: {
        asset: saved,
        draft: updatedDraft
      }
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin: Upload fallback poster image asset.
 */
export async function uploadPosterAsset(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No poster image provided." });
    }

    const saved = await saveHeroAsset(req.file, "poster");
    const adminState = await getAdminHeroBackground();
    const currentDraft = adminState.draft || adminState.active || {};

    const updatedDraft = await saveHeroBackgroundDraft(
      {
        ...currentDraft,
        posterUrl: saved.url,
        fileMetadata: {
          ...(currentDraft.fileMetadata || {}),
          poster: {
            filename: saved.filename,
            originalName: saved.originalName,
            size: saved.size,
            mimeType: saved.mimeType,
            format: saved.format,
            uploadedAt: new Date().toISOString()
          }
        }
      },
      req.user
    );

    await writeSecurityAudit({
      req,
      user: req.user,
      action: "HERO_VIDEO_UPLOAD_POSTER",
      entity: "HeroBackgroundVideo",
      entityId: updatedDraft.id,
      details: { filename: saved.filename, size: saved.size, format: saved.format }
    });

    return res.status(201).json({
      success: true,
      message: "Fallback poster image uploaded successfully.",
      data: {
        asset: saved,
        draft: updatedDraft
      }
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin: Save draft configuration & settings.
 */
export async function saveHeroDraft(req, res, next) {
  try {
    const {
      title,
      videoUrl,
      mobileVideoUrl,
      posterUrl,
      videoType,
      playbackSettings,
      overlayOpacity,
      videoPosition,
      playbackSpeed,
      versionNotes
    } = req.body || {};

    // Validate ranges
    if (overlayOpacity != null) {
      const op = Number(overlayOpacity);
      if (Number.isNaN(op) || op < 0 || op > 1) {
        return res.status(400).json({ success: false, message: "Overlay opacity must be between 0 and 1." });
      }
    }

    if (playbackSpeed != null) {
      const sp = Number(playbackSpeed);
      if (Number.isNaN(sp) || sp < 0.25 || sp > 2.0) {
        return res.status(400).json({ success: false, message: "Playback speed must be between 0.25 and 2.0." });
      }
    }

    const draft = await saveHeroBackgroundDraft(
      {
        title: title ? String(title).slice(0, 150) : undefined,
        videoUrl: videoUrl != null ? String(videoUrl).trim() : undefined,
        mobileVideoUrl: mobileVideoUrl != null ? String(mobileVideoUrl).trim() : undefined,
        posterUrl: posterUrl != null ? String(posterUrl).trim() : undefined,
        videoType: videoType != null ? String(videoType).trim() : undefined,
        playbackSettings: typeof playbackSettings === "object" ? playbackSettings : undefined,
        overlayOpacity: overlayOpacity != null ? Number(overlayOpacity) : undefined,
        videoPosition: videoPosition ? String(videoPosition).trim() : undefined,
        playbackSpeed: playbackSpeed != null ? Number(playbackSpeed) : undefined,
        versionNotes: versionNotes ? String(versionNotes).slice(0, 500) : undefined
      },
      req.user
    );

    await writeSecurityAudit({
      req,
      user: req.user,
      action: "HERO_VIDEO_DRAFT_SAVE",
      entity: "HeroBackgroundVideo",
      entityId: draft.id,
      details: { version: draft.version, title: draft.title }
    });

    await invalidateCmsCache("hero");
    return res.json({
      success: true,
      message: "Hero background draft saved successfully.",
      data: draft
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin: Publish hero background video to live website.
 */
export async function publishHeroVideo(req, res, next) {
  try {
    let targetId = req.body?.id;

    if (!targetId) {
      // Default to current draft or active
      const adminState = await getAdminHeroBackground();
      const fallback = adminState.draft || adminState.active;
      if (!fallback?._id && !fallback?.id) {
        return res.status(400).json({ success: false, message: "No active draft found to publish." });
      }
      targetId = fallback._id || fallback.id;
    }

    const published = await publishHeroBackground(targetId, req.user);

    await writeSecurityAudit({
      req,
      user: req.user,
      action: "HERO_VIDEO_PUBLISHED",
      entity: "HeroBackgroundVideo",
      entityId: published.id,
      details: { version: published.version, videoUrl: published.videoUrl }
    });

    await deleteCache("cms:hero:video:active");
    await deleteCache("cms:hero-video:active");
    await invalidateCmsCache("hero");
    await invalidateCmsCache("hero-video");
    return res.json({
      success: true,
      message: `Version ${published.version} published to live homepage successfully.`,
      data: published
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin: Unpublish active video.
 */
export async function unpublishHeroVideo(req, res, next) {
  try {
    let targetId = req.body?.id;
    if (!targetId) {
      const active = await getActiveHeroBackground();
      if (!active?._id) {
        return res.status(400).json({ success: false, message: "No active published hero video found to unpublish." });
      }
      targetId = active._id;
    }

    const unpublished = await unpublishHeroBackground(targetId, req.user);

    await writeSecurityAudit({
      req,
      user: req.user,
      action: "HERO_VIDEO_UNPUBLISHED",
      entity: "HeroBackgroundVideo",
      entityId: unpublished.id,
      details: { version: unpublished.version }
    });

    await deleteCache("cms:hero:video:active");
    await invalidateCmsCache("hero");
    return res.json({
      success: true,
      message: "Active hero background video unpublished successfully.",
      data: unpublished
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin: Restore a previous version.
 */
export async function restoreHeroVersion(req, res, next) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Version ID is required." });
    }

    const restored = await restoreHeroBackgroundVersion(id, req.user);

    await writeSecurityAudit({
      req,
      user: req.user,
      action: "HERO_VIDEO_RESTORED",
      entity: "HeroBackgroundVideo",
      entityId: restored.id,
      details: { restoredFrom: id, newVersion: restored.version }
    });

    await deleteCache("cms:hero:video:active");
    await invalidateCmsCache("hero");
    return res.json({
      success: true,
      message: `Restored Version ${restored.version} and published to live website.`,
      data: restored
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin: View version history.
 */
export async function getHeroVersionHistory(req, res, next) {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const history = await listHeroBackgroundHistory({ page, limit });

    return res.json({
      success: true,
      data: history
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin: Delete a specific historical configuration.
 */
export async function deleteHeroVersion(req, res, next) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Version ID is required." });
    }

    const deleted = await deleteHeroBackgroundVersion(id);

    await writeSecurityAudit({
      req,
      user: req.user,
      action: "HERO_VIDEO_DELETED",
      entity: "HeroBackgroundVideo",
      entityId: id,
      details: { version: deleted.version }
    });

    return res.json({
      success: true,
      message: `Hero background version ${deleted.version} deleted successfully.`,
      data: deleted
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Admin: Remove an individual asset from draft.
 */
export async function removeHeroDraftAsset(req, res, next) {
  try {
    const { type } = req.params;
    const updated = await removeAssetFromDraft(type, req.user);

    await writeSecurityAudit({
      req,
      user: req.user,
      action: "HERO_VIDEO_ASSET_REMOVED",
      entity: "HeroBackgroundVideo",
      entityId: updated.id,
      details: { assetType: type }
    });

    return res.json({
      success: true,
      message: `Asset '${type}' removed from draft.`,
      data: updated
    });
  } catch (error) {
    return next(error);
  }
}
