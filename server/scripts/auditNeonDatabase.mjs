import { getPostgresPool } from "../src/db/postgres.js";

async function auditNeonDatabase() {
  console.log("==================================================================");
  console.log("NEON POSTGRESQL READ-ONLY DATABASE CAPACITY & STORAGE AUDIT");
  console.log("==================================================================\n");

  const pool = getPostgresPool();

  try {
    // 1. Overall Database Size
    const dbSizeRes = await pool.query(`
      SELECT 
        current_database() as db_name,
        pg_database_size(current_database()) as total_bytes,
        pg_size_pretty(pg_database_size(current_database())) as total_size_pretty
    `);
    const dbInfo = dbSizeRes.rows[0];
    console.log(`[1] DATABASE SIZE:`);
    console.log(`    Database Name: ${dbInfo.db_name}`);
    console.log(`    Total Storage Size: ${dbInfo.total_size_pretty} (${Number(dbInfo.total_bytes).toLocaleString()} bytes)\n`);

    // 2. All Tables with Row Counts, Data Size, Index Size, Total Size
    const tablesRes = await pool.query(`
      SELECT
        c.relname AS table_name,
        c.reltuples::BIGINT AS estimated_rows,
        pg_table_size(c.oid) AS data_bytes,
        pg_size_pretty(pg_table_size(c.oid)) AS data_size_pretty,
        pg_indexes_size(c.oid) AS index_bytes,
        pg_size_pretty(pg_indexes_size(c.oid)) AS index_size_pretty,
        pg_total_relation_size(c.oid) AS total_bytes,
        pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size_pretty
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY pg_total_relation_size(c.oid) DESC
    `);

    console.log(`[2] ALL TABLES STORAGE BREAKDOWN (Sorted by Total Size):`);
    console.table(
      tablesRes.rows.map(r => ({
        Table: r.table_name,
        Rows: Number(r.estimated_rows),
        "Data Size": r.data_size_pretty,
        "Index Size": r.index_size_pretty,
        "Total Size": r.total_size_pretty,
        "Bytes": Number(r.total_bytes)
      }))
    );

    // 3. Top Indexes by Size
    const indexRes = await pool.query(`
      SELECT
        i.relname AS index_name,
        t.relname AS table_name,
        pg_relation_size(i.oid) AS index_bytes,
        pg_size_pretty(pg_relation_size(i.oid)) AS index_size_pretty
      FROM pg_class i
      JOIN pg_index x ON x.indexrelid = i.oid
      JOIN pg_class t ON t.oid = x.indrelid
      JOIN pg_namespace n ON n.oid = i.relnamespace
      WHERE n.nspname = 'public' AND i.relkind = 'i'
      ORDER BY pg_relation_size(i.oid) DESC
      LIMIT 15
    `);
    console.log(`\n[3] TOP 15 LARGEST INDEXES:`);
    console.table(
      indexRes.rows.map(r => ({
        Index: r.index_name,
        Table: r.table_name,
        Size: r.index_size_pretty,
        Bytes: Number(r.index_bytes)
      }))
    );

    // 4. Dead Tuples and Bloat Indicators
    const bloatRes = await pool.query(`
      SELECT
        relname AS table_name,
        n_live_tup,
        n_dead_tup,
        CASE WHEN n_live_tup + n_dead_tup > 0 
          THEN ROUND((n_dead_tup::NUMERIC / (n_live_tup + n_dead_tup)) * 100, 2)
          ELSE 0 
        END AS dead_tup_pct,
        last_vacuum,
        last_autovacuum,
        vacuum_count,
        autovacuum_count
      FROM pg_stat_user_tables
      ORDER BY n_dead_tup DESC
      LIMIT 15
    `);
    console.log(`\n[4] DEAD TUPLES & BLOAT INDICATORS:`);
    console.table(bloatRes.rows);

    // 5. Media & Media Chunks Deep-Dive
    console.log(`\n[5] MEDIA STORAGE DEEP-DIVE:`);
    const mediaCountRes = await pool.query(`
      SELECT
        COUNT(*)::INT AS total_records,
        COUNT(*) FILTER (WHERE is_video = true)::INT AS video_count,
        COUNT(*) FILTER (WHERE is_video = false OR is_video IS NULL)::INT AS non_video_count,
        COALESCE(SUM(size), 0)::BIGINT AS total_declared_bytes,
        pg_size_pretty(COALESCE(SUM(size), 0)::BIGINT) AS total_declared_pretty,
        ROUND(COALESCE(AVG(size), 0))::BIGINT AS avg_file_size,
        pg_size_pretty(ROUND(COALESCE(AVG(size), 0))::BIGINT) AS avg_size_pretty,
        COUNT(*) FILTER (WHERE upload_status = 'completed')::INT AS completed_count,
        COUNT(*) FILTER (WHERE upload_status != 'completed')::INT AS incomplete_count
      FROM "media"
    `);
    console.log("Media Overview:", mediaCountRes.rows[0]);

    const chunksCountRes = await pool.query(`
      SELECT
        COUNT(*)::INT AS total_chunks,
        COALESCE(SUM(chunk_size), 0)::BIGINT AS total_chunks_declared_bytes,
        pg_size_pretty(COALESCE(SUM(chunk_size), 0)::BIGINT) AS total_chunks_pretty,
        COALESCE(SUM(octet_length(data)), 0)::BIGINT AS actual_binary_bytes,
        pg_size_pretty(COALESCE(SUM(octet_length(data)), 0)::BIGINT) AS actual_binary_pretty
      FROM "media_chunks"
    `);
    console.log("Media Chunks Overview:", chunksCountRes.rows[0]);

    // Check for orphaned chunks (chunks where media_id has no corresponding row in media)
    const orphanChunksRes = await pool.query(`
      SELECT COUNT(*)::INT as orphan_chunk_count,
             COALESCE(SUM(chunk_size), 0)::BIGINT as orphan_bytes,
             pg_size_pretty(COALESCE(SUM(chunk_size), 0)::BIGINT) as orphan_pretty
      FROM "media_chunks" c
      WHERE NOT EXISTS (SELECT 1 FROM "media" m WHERE m._id = c.media_id)
    `);
    console.log("Orphaned Chunks:", orphanChunksRes.rows[0]);

    // Check temporary upload sessions and parts
    const tempUploadsRes = await pool.query(`
      SELECT 
        (SELECT COUNT(*)::INT FROM "media_upload_sessions") AS active_sessions_count,
        (SELECT COUNT(*)::INT FROM "media_upload_sessions" WHERE expires_at < now()) AS expired_sessions_count,
        (SELECT COUNT(*)::INT FROM "media_upload_parts") AS upload_parts_count,
        (SELECT COALESCE(SUM(octet_length(data)), 0)::BIGINT FROM "media_upload_parts") AS upload_parts_bytes,
        (SELECT pg_size_pretty(COALESCE(SUM(octet_length(data)), 0)::BIGINT) FROM "media_upload_parts") AS upload_parts_pretty
    `);
    console.log("Temporary Upload Pipeline:", tempUploadsRes.rows[0]);

    // Top 10 Largest Media Files
    const topMediaRes = await pool.query(`
      SELECT 
        _id,
        filename,
        category,
        mime_type,
        size,
        pg_size_pretty(size::BIGINT) AS size_pretty,
        is_video,
        total_chunks,
        created_at
      FROM "media"
      ORDER BY size DESC
      LIMIT 10
    `);
    console.log("\nTop 10 Largest Media Files in Neon:");
    console.table(topMediaRes.rows);

    // 6. Media Reference Cross-Check
    const refCheckRes = await pool.query(`
      SELECT 
        m._id,
        m.filename,
        m.url,
        m.path,
        m.size,
        pg_size_pretty(m.size::BIGINT) as size_pretty,
        (SELECT COUNT(*) FROM "herobackgroundvideos" h WHERE h.video_url = m.url OR h.video_url LIKE '%' || m.filename || '%') AS hero_bg_refs,
        (SELECT COUNT(*) FROM "heroslides" s WHERE s.main_image = m.url OR s.main_image LIKE '%' || m.filename || '%') AS hero_slide_refs,
        (SELECT COUNT(*) FROM "portfolioitems" p WHERE p.cover_image = m.url OR p.video_url = m.url OR p.cover_image LIKE '%' || m.filename || '%' OR p.video_url LIKE '%' || m.filename || '%') AS portfolio_refs
      FROM "media" m
      ORDER BY m.created_at DESC
      LIMIT 20
    `);
    console.log("\nMedia Reference Cross-Check (Sample of 20):");
    console.table(refCheckRes.rows);

  } catch (err) {
    console.error("Audit error:", err);
  } finally {
    await pool.end();
  }
}

auditNeonDatabase();
