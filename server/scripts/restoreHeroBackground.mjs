import dotenv from 'dotenv';
dotenv.config();
import { getPostgresPool } from '../src/db/postgres.js';

async function restore() {
  const pool = getPostgresPool();
  await pool.query("DELETE FROM herobackgroundvideos WHERE title = 'Targeted Verification Showreel'");
  await pool.query(`
    INSERT INTO "herobackgroundvideos" (
      "_id", "title", "video_url", "mobile_video_url", "poster_url", "video_type", "status",
      "playback_settings", "overlay_opacity", "video_position", "playback_speed",
      "version", "version_notes", "created_by", "updated_by", "published_at", "created_at", "updated_at"
    ) VALUES (
      '7ca7d162023e4c33b7486263',
      'Hero Background Film',
      '/uploads/hero/2173b0d2-1f52-4680-908e-c6ee0bc50f5c-1795768297536-312357.mp4',
      '', '', 'video/mp4', 'published',
      '{"loop": true, "muted": true, "autoplay": true, "playsInline": true}'::jsonb,
      0.42, 'center', 1.0, 1, 'Initial Published Hero Video', 'admin', 'admin', now(), now(), now()
    ) ON CONFLICT ("_id") DO UPDATE SET
      "status" = 'published',
      "video_url" = '/uploads/hero/2173b0d2-1f52-4680-908e-c6ee0bc50f5c-1795768297536-312357.mp4',
      "title" = 'Hero Background Film',
      "published_at" = now(),
      "updated_at" = now()
  `);

  const res = await pool.query('SELECT * FROM herobackgroundvideos WHERE status = \'published\'');
  console.log('Active Published Hero Video in DB:', res.rows.map(r => ({ id: r._id, title: r.title, video_url: r.video_url, status: r.status })));
  process.exit(0);
}

restore();
