-- Generated from server/src/models/*.model.js by server/scripts/generate-postgres-schema.mjs.
-- Review against the live MongoDB catalog before applying. This migration is never auto-applied by the app.
-- MongoDB ObjectIds are preserved as TEXT in _id and reference columns.
-- Nested paths are flattened with a double underscore (e.g. two_factor__enabled).
-- Arrays and flexible values use JSONB. GridFS file bytes are not copied into PostgreSQL.
-- Timestamp columns are nullable to preserve legacy Mongo documents without timestamps.
-- Foreign keys use RESTRICT for required references, SET NULL for optional history references, and CASCADE for disposable sessions/OTP/devices/video analytics.
-- The migration runner must validate live references before inserting the data copy.

BEGIN;
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS migration_runs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_collection TEXT NOT NULL,
  last_source_id TEXT,
  migrated_count BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error_summary TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_collection)
);
CREATE TABLE IF NOT EXISTS mongo_migration_extras (
  source_collection TEXT NOT NULL,
  source_id TEXT NOT NULL,
  document JSONB NOT NULL,
  PRIMARY KEY (source_collection, source_id)
);
CREATE TABLE IF NOT EXISTS mongo_migration_mixed_bson (
  source_collection TEXT NOT NULL,
  source_id TEXT NOT NULL,
  document JSONB NOT NULL,
  PRIMARY KEY (source_collection, source_id)
);
CREATE TABLE IF NOT EXISTS media_upload_sessions (
  upload_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  folder TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  total_size BIGINT NOT NULL CHECK (total_size > 0),
  part_count INTEGER NOT NULL CHECK (part_count > 0),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_media_upload_sessions_expires_at ON media_upload_sessions (expires_at);
CREATE TABLE IF NOT EXISTS media_upload_parts (
  upload_id TEXT NOT NULL REFERENCES media_upload_sessions(upload_id) ON DELETE CASCADE,
  part_index INTEGER NOT NULL CHECK (part_index >= 0),
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (upload_id, part_index)
);

CREATE TABLE IF NOT EXISTS "aboutmes" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "key" TEXT DEFAULT 'about_me_content',
  "full_name" TEXT DEFAULT 'Akshay Chhabra',
  "designation" TEXT DEFAULT 'Founder & Creative Director',
  "location" TEXT DEFAULT 'Mohali, Punjab • Global Remote',
  "profile_image" TEXT DEFAULT '/assets/akshay-chhabra-founder.jpg',
  "quote" TEXT DEFAULT 'Every frame matters. Every story deserves its own visual language.',
  "intro_badge" TEXT DEFAULT 'FOUNDER & CREATIVE DIRECTOR',
  "intro_title" TEXT DEFAULT 'Akshay Chhabra',
  "intro_subtitle" TEXT DEFAULT 'Founder and creative force behind The Editing Table — crafting bespoke visual language and cinematic color science for premier storytellers worldwide.',
  "about_heading" TEXT DEFAULT 'Crafting Stories Beyond The Frame',
  "about_paragraphs" JSONB DEFAULT '["Founded by Akshay Chhabra, The Editing Table was established with a singular conviction: every filmmaker, photographer, and creative brand deserves post-production that elevates their visual storytelling to cinematic perfection.","Over the past decade, Akshay has overseen hundreds of luxury wedding films, high-fashion editorial campaigns, and commercial master deliveries across India, the UK, Europe, and North America.","Working at the intersection of raw human emotion and technical color science, Akshay personally directs the production workflow to preserve each client''s signature aesthetic while applying calibrated 35mm analog emulation and precision color grading."]'::jsonb,
  "vision_heading" TEXT DEFAULT 'A Vision for Global Cinematic Post-Production',
  "vision_text" TEXT DEFAULT 'To build an artist-first post-production house that bridges the gap between raw footage capture and theatrical-grade master delivery. By combining calibrated color-managed pipelines (ACES / DaVinci YRGB) with artisanal retouching, we empower filmmakers and photographers to scale their output without compromising on bespoke craftsmanship.',
  "experience_years" TEXT DEFAULT '10+ Years',
  "experience_heading" TEXT DEFAULT 'A Decade of Specialized Film & Editorial Craft',
  "experience_text" TEXT DEFAULT 'A journey rooted in the editing room, evolving from independent documentary and film assembly into leading one of the premier post-production teams in the region. Akshay has refined precision grading workflows for ARRI, RED, Sony Venice, and Canon Cinema RAW systems.',
  "skills" JSONB DEFAULT '["DaVinci Resolve","ACES Color Management","35mm / 65mm Film Stock Emulation","Dolby Vision HDR Mastering","High-Fashion Frequency Separation","Micro Dodge & Burn","RAW Footage Assembly","Audio Mastering & Sound Design"]'::jsonb,
  "what_ido" JSONB DEFAULT '[{"title":"Creative Direction & Color Science","description":"Architecting custom project color palettes, developing bespoke LUTs, and supervising calibrated color grading from RAW ingest to final delivery.","tag":"COLOR & LOOK DEV"},{"title":"Narrative Assembly & Editorial Pacing","description":"Crafting emotional rhythm, story structure, and seamless scene transitions for cinematic wedding films and commercial reels.","tag":"EDITORIAL"},{"title":"Luxury Photo Retouching","description":"Overseeing fine-art portrait retouching, natural skin-texture preservation, and frequency separation for high-fashion and luxury editorial clients.","tag":"RETOUCHING"},{"title":"Creative Oversight & Quality Assurance","description":"Enforcing a rigorous 100% personal quality review gate on every deliverable before client presentation to ensure flawless execution.","tag":"QUALITY GATE"}]'::jsonb,
  "company_role_heading" TEXT DEFAULT 'The Editing Table — Full-Service Creative Capabilities',
  "company_role_text" TEXT DEFAULT 'The Editing Table operates as a dedicated creative extension of your production team. We handle end-to-end post-production logistics: footage proxying, editorial assembly, DaVinci Resolve color grading, frequency separation retouching, sound mastering, and secure cloud delivery with fast 48–72h turnaround cycles.',
  "philosophy_pillars" JSONB DEFAULT '[{"title":"Uncompromising Precision","description":"Every frame is inspected at pixel and waveform level. We never rely on automated shortcuts or generic presets."},{"title":"Filmic Authenticity","description":"Honoring the rich, organic texture of analog film stocks over synthetic digital gloss, creating visuals that stand the test of time."},{"title":"Bespoke Partnership","description":"We adapt to your unique signature style rather than imposing ours, ensuring your brand identity remains distinct and celebrated."}]'::jsonb,
  "updated_by" TEXT,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "adminactivitylogs" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "admin_id" TEXT,
  "action" TEXT NOT NULL,
  "entity_type" TEXT DEFAULT 'VideoShowcase',
  "entity_id" TEXT,
  "changes" JSONB,
  "created_at" TIMESTAMPTZ,
  "__v" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "auditlogs" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "user" TEXT,
  "user_email" TEXT DEFAULT 'system',
  "role" TEXT DEFAULT 'system',
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entity_id" TEXT DEFAULT '',
  "details" JSONB,
  "ip_address" TEXT DEFAULT '',
  "user_agent" TEXT DEFAULT '',
  "result" TEXT DEFAULT 'success',
  "metadata" JSONB,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "blogposts" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "cover_image" TEXT NOT NULL,
  "author__name" TEXT NOT NULL,
  "author__role" TEXT DEFAULT 'Senior Editor',
  "author__avatar" TEXT DEFAULT '',
  "category" TEXT NOT NULL,
  "tags" JSONB,
  "read_time" TEXT DEFAULT '5 min read',
  "status" TEXT DEFAULT 'published',
  "featured" BOOLEAN DEFAULT FALSE,
  "order" DOUBLE PRECISION DEFAULT 0,
  "published_at" TIMESTAMPTZ,
  "seo_title" TEXT DEFAULT '',
  "seo_description" TEXT DEFAULT '',
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "brandcollaborations" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "brand_name" TEXT NOT NULL,
  "brand_logo" TEXT DEFAULT '',
  "short_description" TEXT NOT NULL,
  "full_description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "services" JSONB,
  "cover_image" TEXT NOT NULL,
  "gallery" JSONB,
  "video_url" TEXT DEFAULT '',
  "project_date" TEXT DEFAULT '2026',
  "featured" BOOLEAN DEFAULT FALSE,
  "published" BOOLEAN DEFAULT TRUE,
  "display_order" DOUBLE PRECISION DEFAULT 0,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "careerscontents" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "key" TEXT DEFAULT 'careers_page_content',
  "hero__heading" TEXT DEFAULT 'Build Your Career With Us',
  "hero__description" TEXT DEFAULT 'Join our passionate team of visionary colorists, editors, retouching artists, and creative technologists crafting timeless visual stories for premier filmmakers and creators worldwide.',
  "hero__badge" TEXT DEFAULT 'JOIN OUR CREATIVE TEAM',
  "why_join_us" JSONB DEFAULT '[{"id":"card-1","title":"Creative & Collaborative Environment","description":"Work alongside senior filmmakers, colorists, and post-production leads who respect and nurture artistic vision.","icon":"Users","active":true,"order":0},{"id":"card-2","title":"Work on Exciting Projects","description":"From luxury destination weddings to high-fashion campaigns and cinematic documentaries with global reach.","icon":"Film","active":true,"order":1},{"id":"card-3","title":"Learn & Grow","description":"Continuous mentorship in advanced DaVinci Resolve color science, 35mm film emulation, and high-fashion retouching.","icon":"Sparkles","active":true,"order":2},{"id":"card-4","title":"Flexible & Supportive Culture","description":"Healthy work-life balance, flexible schedules, and dedicated post-production suites designed for artistic focus.","icon":"Heart","active":true,"order":3},{"id":"card-5","title":"Be Part of a Growing Team","description":"Shape the trajectory of our rapidly expanding team as we pioneer bespoke editorial post-production worldwide.","icon":"TrendingUp","active":true,"order":4}]'::jsonb,
  "cta__heading" TEXT DEFAULT 'Don''t See the Right Opening?',
  "cta__description" TEXT DEFAULT 'We are always on the lookout for exceptional talent. Submit your portfolio and resume to join our talent roster.',
  "cta__button_text" TEXT DEFAULT 'Send Your Resume',
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "contactemails" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "email" TEXT NOT NULL,
  "label" TEXT,
  "primary" BOOLEAN DEFAULT FALSE,
  "order" DOUBLE PRECISION DEFAULT 0,
  "status" TEXT DEFAULT 'active',
  "deleted_at" TIMESTAMPTZ DEFAULT NULL,
  "created_by" TEXT,
  "updated_by" TEXT,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "contactoffices" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "office_name" TEXT DEFAULT 'Headquarters',
  "company_name" TEXT DEFAULT 'NHK INFOTECH',
  "address_line1" TEXT DEFAULT 'A-28, Industrial Area, Sector 73',
  "address_line2" TEXT DEFAULT 'Mohali, Punjab 160055',
  "city" TEXT DEFAULT 'Mohali',
  "state" TEXT DEFAULT 'Punjab',
  "country" TEXT DEFAULT 'India',
  "postal_code" TEXT DEFAULT '160055',
  "google_map_url" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "order" DOUBLE PRECISION DEFAULT 0,
  "status" TEXT DEFAULT 'active',
  "deleted_at" TIMESTAMPTZ DEFAULT NULL,
  "created_by" TEXT,
  "updated_by" TEXT,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "contactphones" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "country" TEXT DEFAULT 'India',
  "country_code" TEXT DEFAULT 'IN',
  "phone" TEXT NOT NULL,
  "display_phone" TEXT,
  "label" TEXT,
  "whatsapp_enabled" BOOLEAN DEFAULT FALSE,
  "call_enabled" BOOLEAN DEFAULT TRUE,
  "order" DOUBLE PRECISION DEFAULT 0,
  "status" TEXT DEFAULT 'active',
  "deleted_at" TIMESTAMPTZ DEFAULT NULL,
  "created_by" TEXT,
  "updated_by" TEXT,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "contactsettings" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "settings_key" TEXT DEFAULT 'contact-settings',
  "section_title" TEXT DEFAULT 'CONTACT US',
  "phone_heading" TEXT DEFAULT 'PHONE',
  "email_heading" TEXT DEFAULT 'EMAIL',
  "office_heading" TEXT DEFAULT 'OFFICE',
  "working_hours_heading" TEXT DEFAULT 'WORKING HOURS',
  "cta_text" TEXT DEFAULT 'Let''s Work Together',
  "cta_link" TEXT DEFAULT '/contactus',
  "cta_new_tab" BOOLEAN DEFAULT FALSE,
  "section_enabled" BOOLEAN DEFAULT TRUE,
  "phone_enabled" BOOLEAN DEFAULT TRUE,
  "email_enabled" BOOLEAN DEFAULT TRUE,
  "office_enabled" BOOLEAN DEFAULT TRUE,
  "working_hours_enabled" BOOLEAN DEFAULT TRUE,
  "cta_enabled" BOOLEAN DEFAULT TRUE,
  "updated_by" TEXT,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "emailotps" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "user" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "otp_hash" TEXT NOT NULL,
  "salt" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "attempts" DOUBLE PRECISION DEFAULT 0,
  "max_attempts" DOUBLE PRECISION DEFAULT 5,
  "resend_available_at" TIMESTAMPTZ NOT NULL,
  "consumed_at" TIMESTAMPTZ DEFAULT NULL,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "enquiries" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT DEFAULT '',
  "service" TEXT NOT NULL,
  "budget" TEXT DEFAULT 'Discuss after scope',
  "delivery_date" TEXT DEFAULT '',
  "reference_url" TEXT DEFAULT '',
  "description" TEXT NOT NULL,
  "status" TEXT DEFAULT 'pending',
  "source" TEXT DEFAULT 'website_contact_form',
  "assigned_to" TEXT DEFAULT '',
  "internal_notes" TEXT DEFAULT '',
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "heroslides" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "slide_number" DOUBLE PRECISION DEFAULT 1,
  "slide_key" TEXT NOT NULL,
  "slide_type" TEXT NOT NULL DEFAULT 'ceo',
  "layout_type" TEXT DEFAULT 'ceo_editorial',
  "label" TEXT DEFAULT '',
  "eyebrow" TEXT DEFAULT '',
  "heading_lines" JSONB,
  "title" TEXT NOT NULL,
  "subtitle" TEXT DEFAULT '',
  "tag" TEXT DEFAULT '',
  "caption" TEXT DEFAULT '',
  "description" TEXT DEFAULT '',
  "feature_items" JSONB,
  "quote" TEXT DEFAULT '',
  "cta_text" TEXT DEFAULT '',
  "cta_link" TEXT DEFAULT '',
  "trust_label" TEXT DEFAULT '',
  "main_image" TEXT DEFAULT '',
  "images" JSONB,
  "image_grid" JSONB,
  "featured_image_index" DOUBLE PRECISION DEFAULT 0,
  "order" DOUBLE PRECISION DEFAULT 0,
  "active" BOOLEAN DEFAULT TRUE,
  "status" TEXT DEFAULT 'published',
  "transition_duration" DOUBLE PRECISION DEFAULT 5000,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "jobs" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "title" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "location" TEXT DEFAULT 'Mohali, Punjab • Onsite / Hybrid',
  "employment_type" TEXT DEFAULT 'Full Time',
  "experience" TEXT DEFAULT '2+ Years',
  "salary" TEXT DEFAULT 'Competitive / Based on Portfolio',
  "description" TEXT NOT NULL,
  "responsibilities" JSONB DEFAULT '[]'::jsonb,
  "required_skills" JSONB DEFAULT '[]'::jsonb,
  "preferred_skills" JSONB DEFAULT '[]'::jsonb,
  "benefits" JSONB DEFAULT '[]'::jsonb,
  "deadline" TEXT DEFAULT '',
  "status" TEXT DEFAULT 'Active',
  "order" DOUBLE PRECISION DEFAULT 0,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "jobapplications" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "job_id" TEXT DEFAULT NULL,
  "position_title" TEXT NOT NULL,
  "applicant_name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "portfolio" TEXT DEFAULT '',
  "linkedin" TEXT DEFAULT '',
  "resume__url" TEXT NOT NULL,
  "resume__filename" TEXT NOT NULL,
  "resume__original_name" TEXT DEFAULT '',
  "resume__size" DOUBLE PRECISION DEFAULT 0,
  "resume__mime_type" TEXT DEFAULT 'application/pdf',
  "cover_letter" TEXT DEFAULT '',
  "status" TEXT DEFAULT 'New',
  "admin_notes" TEXT DEFAULT '',
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "media" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "filename" TEXT NOT NULL,
  "original_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size" DOUBLE PRECISION NOT NULL,
  "url" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "category" TEXT DEFAULT 'general',
  "alt_text" TEXT DEFAULT '',
  "uploaded_by" TEXT,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "partners" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "name" TEXT NOT NULL,
  "category" TEXT DEFAULT 'Production House',
  "location_tag" TEXT DEFAULT 'Global',
  "logo" TEXT DEFAULT '',
  "image" TEXT DEFAULT '',
  "website" TEXT DEFAULT 'https://theeditingtable.com',
  "order" DOUBLE PRECISION DEFAULT 0,
  "active" BOOLEAN DEFAULT TRUE,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "photoshowcaseitems" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "property_name" TEXT,
  "location" TEXT,
  "category" TEXT DEFAULT 'High-End Photo Retouching',
  "tags" JSONB,
  "image__public_id" TEXT,
  "image__url" TEXT,
  "image__path" TEXT,
  "image__alt_text" TEXT,
  "mobile_image__public_id" TEXT,
  "mobile_image__url" TEXT,
  "mobile_image__path" TEXT,
  "mobile_image__alt_text" TEXT,
  "badge_text" TEXT,
  "cta_text" TEXT,
  "cta_url" TEXT,
  "open_in_new_tab" BOOLEAN DEFAULT FALSE,
  "order" DOUBLE PRECISION DEFAULT 0,
  "is_featured" BOOLEAN DEFAULT FALSE,
  "is_active" BOOLEAN DEFAULT TRUE,
  "views" DOUBLE PRECISION DEFAULT 0,
  "clicks" DOUBLE PRECISION DEFAULT 0,
  "published_at" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ,
  "deleted_at" TIMESTAMPTZ DEFAULT NULL,
  "created_by" TEXT,
  "updated_by" TEXT,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "photoshowcasesettings" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "settings_key" TEXT DEFAULT 'photo-showcase',
  "heading" TEXT DEFAULT 'Masterpiece High-End Photo Retouching & Color Suite',
  "subheading" TEXT DEFAULT 'Bespoke architectural imagery, high-end editorial photo retouching, and luxury property portfolios crafted with precision.',
  "show_section" BOOLEAN DEFAULT TRUE,
  "show_subheading" BOOLEAN DEFAULT TRUE,
  "alignment" TEXT DEFAULT 'center',
  "heading_color" TEXT DEFAULT '#2F3A2F',
  "text_color" TEXT DEFAULT '#687567',
  "background_color" TEXT DEFAULT '#F8FBF7',
  "section_padding_top" DOUBLE PRECISION DEFAULT 80,
  "section_padding_bottom" DOUBLE PRECISION DEFAULT 80,
  "max_width" DOUBLE PRECISION DEFAULT 1440,
  "autoplay" BOOLEAN DEFAULT TRUE,
  "autoplay_delay" DOUBLE PRECISION DEFAULT 5000,
  "infinite_loop" BOOLEAN DEFAULT TRUE,
  "pause_on_hover" BOOLEAN DEFAULT TRUE,
  "card_radius" DOUBLE PRECISION DEFAULT 24,
  "show_arrows" BOOLEAN DEFAULT TRUE,
  "show_pagination" BOOLEAN DEFAULT TRUE,
  "cta_text" TEXT DEFAULT 'Explore Full Gallery',
  "cta_url" TEXT DEFAULT '/portfolio',
  "cta_visible" BOOLEAN DEFAULT TRUE,
  "cta_new_tab" BOOLEAN DEFAULT FALSE,
  "anchor_id" TEXT DEFAULT 'photo-showcase',
  "updated_by" TEXT,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "portfolioitems" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "client" TEXT DEFAULT '',
  "date" TEXT DEFAULT '',
  "metadata" TEXT DEFAULT '',
  "description" TEXT DEFAULT '',
  "image" TEXT NOT NULL,
  "cover_image" TEXT DEFAULT '',
  "video_url" TEXT DEFAULT '',
  "deliverables" JSONB,
  "is_featured" BOOLEAN DEFAULT FALSE,
  "order" DOUBLE PRECISION DEFAULT 0,
  "is_published" BOOLEAN DEFAULT TRUE,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "reviews" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT DEFAULT '',
  "company" TEXT DEFAULT '',
  "project_type" TEXT NOT NULL,
  "rating" DOUBLE PRECISION NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "profile_image" TEXT DEFAULT '',
  "project_image" TEXT DEFAULT '',
  "country" TEXT DEFAULT '',
  "city" TEXT DEFAULT '',
  "verified" BOOLEAN DEFAULT FALSE,
  "featured" BOOLEAN DEFAULT FALSE,
  "status" TEXT DEFAULT 'pending',
  "admin_reply__message" TEXT DEFAULT '',
  "admin_reply__replied_at" TIMESTAMPTZ,
  "admin_reply__replied_by" TEXT DEFAULT '',
  "ip_address" TEXT DEFAULT '',
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "securitypolicies" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "key" TEXT DEFAULT 'global',
  "require_admin2_fa" BOOLEAN DEFAULT TRUE,
  "require_user2_fa" BOOLEAN DEFAULT FALSE,
  "allowed_methods" JSONB DEFAULT '["email","totp"]'::jsonb,
  "trusted_device_days" DOUBLE PRECISION DEFAULT 30,
  "max_failed_attempts" DOUBLE PRECISION DEFAULT 5,
  "lock_minutes" DOUBLE PRECISION DEFAULT 15,
  "session_expiry_hours" DOUBLE PRECISION DEFAULT 24,
  "recovery_code_count" DOUBLE PRECISION DEFAULT 10,
  "updated_by" TEXT,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "services" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "full_description" TEXT DEFAULT '',
  "category" TEXT DEFAULT 'Post-Production',
  "tagline" TEXT DEFAULT '',
  "image" TEXT DEFAULT '',
  "price" TEXT DEFAULT '',
  "turnaround" TEXT DEFAULT '48-72 Hours',
  "features" JSONB,
  "deliverables" JSONB,
  "icon" TEXT DEFAULT 'Sparkles',
  "order" DOUBLE PRECISION DEFAULT 0,
  "is_published" BOOLEAN DEFAULT TRUE,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "user" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "revoked_at" TIMESTAMPTZ,
  "revoke_reason" TEXT DEFAULT '',
  "ip_address" TEXT DEFAULT '',
  "user_agent" TEXT DEFAULT '',
  "last_seen_at" TIMESTAMPTZ,
  "two_factor_verified" BOOLEAN DEFAULT FALSE,
  "trusted_device_used" BOOLEAN DEFAULT FALSE,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "sitesettings" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "group" TEXT DEFAULT 'general',
  "description" TEXT DEFAULT '',
  "updated_by" TEXT,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "teammembers" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "full_name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "designation" TEXT NOT NULL,
  "category" TEXT DEFAULT 'Editorial Artist',
  "short_bio" TEXT NOT NULL,
  "full_bio" TEXT DEFAULT '',
  "profile_image" TEXT NOT NULL,
  "skills" JSONB,
  "experience" TEXT DEFAULT '5+ Years',
  "social_links__instagram" TEXT DEFAULT '',
  "social_links__linkedin" TEXT DEFAULT '',
  "social_links__vimeo" TEXT DEFAULT '',
  "featured" BOOLEAN DEFAULT FALSE,
  "active" BOOLEAN DEFAULT TRUE,
  "display_order" DOUBLE PRECISION DEFAULT 0,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "trusteddevices" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "user" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "name" TEXT DEFAULT 'Trusted browser',
  "ip_address" TEXT DEFAULT '',
  "user_agent" TEXT DEFAULT '',
  "last_used_at" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "revoked_at" TIMESTAMPTZ,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "users" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" TEXT DEFAULT 'admin',
  "avatar" TEXT DEFAULT '',
  "is_active" BOOLEAN DEFAULT TRUE,
  "last_login_at" TIMESTAMPTZ,
  "last_login_ip" TEXT DEFAULT '',
  "force_security_setup" BOOLEAN DEFAULT FALSE,
  "two_factor__enabled" BOOLEAN DEFAULT FALSE,
  "two_factor__required" BOOLEAN DEFAULT FALSE,
  "two_factor__method" TEXT DEFAULT '',
  "two_factor__secret_encrypted" TEXT DEFAULT '',
  "two_factor__pending_secret_encrypted" TEXT DEFAULT '',
  "two_factor__recovery_code_hashes" JSONB DEFAULT '[]'::jsonb,
  "two_factor__activated_at" TIMESTAMPTZ,
  "two_factor__last_authenticated_at" TIMESTAMPTZ,
  "two_factor__last_used_counter" DOUBLE PRECISION DEFAULT -1,
  "two_factor__failed_attempts" DOUBLE PRECISION DEFAULT 0,
  "two_factor__lock_until" TIMESTAMPTZ,
  "two_factor__reset_at" TIMESTAMPTZ,
  "failed_password_attempts" DOUBLE PRECISION DEFAULT 0,
  "account_lock_until" TIMESTAMPTZ,
  "pre_auth_nonce_hash" TEXT DEFAULT '',
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "videoanalytics" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "video_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "session_id" TEXT,
  "device_type" TEXT,
  "browser" TEXT,
  "operating_system" TEXT,
  "referrer" TEXT,
  "ip_hash" TEXT,
  "created_at" TIMESTAMPTZ,
  "__v" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "videoshowcaseitems" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "property_name" TEXT,
  "location" TEXT,
  "category" TEXT DEFAULT 'Real Estate & Architecture',
  "tags" JSONB,
  "source_type" TEXT DEFAULT 'upload',
  "video_url" TEXT,
  "video_file__public_id" TEXT,
  "video_file__url" TEXT,
  "video_file__path" TEXT,
  "video_file__mime_type" TEXT,
  "video_file__size" DOUBLE PRECISION,
  "video_file__original_name" TEXT,
  "mobile_video_file__public_id" TEXT,
  "mobile_video_file__url" TEXT,
  "mobile_video_file__path" TEXT,
  "mobile_video_file__mime_type" TEXT,
  "mobile_video_file__size" DOUBLE PRECISION,
  "mobile_video_file__original_name" TEXT,
  "thumbnail__public_id" TEXT,
  "thumbnail__url" TEXT,
  "thumbnail__path" TEXT,
  "thumbnail__alt_text" TEXT,
  "mobile_thumbnail__public_id" TEXT,
  "mobile_thumbnail__url" TEXT,
  "mobile_thumbnail__path" TEXT,
  "mobile_thumbnail__alt_text" TEXT,
  "caption_url" TEXT,
  "duration" DOUBLE PRECISION DEFAULT 0,
  "badge_text" TEXT,
  "cta_text" TEXT,
  "cta_url" TEXT,
  "open_in_new_tab" BOOLEAN DEFAULT FALSE,
  "order" DOUBLE PRECISION DEFAULT 0,
  "is_featured" BOOLEAN DEFAULT FALSE,
  "is_active" BOOLEAN DEFAULT TRUE,
  "autoplay" BOOLEAN DEFAULT FALSE,
  "loop" BOOLEAN DEFAULT TRUE,
  "muted" BOOLEAN DEFAULT TRUE,
  "show_controls" BOOLEAN DEFAULT FALSE,
  "views" DOUBLE PRECISION DEFAULT 0,
  "play_clicks" DOUBLE PRECISION DEFAULT 0,
  "completed_views" DOUBLE PRECISION DEFAULT 0,
  "cta_clicks" DOUBLE PRECISION DEFAULT 0,
  "published_at" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ,
  "seo_title" TEXT,
  "seo_description" TEXT,
  "og_image__public_id" TEXT,
  "og_image__url" TEXT,
  "og_image__path" TEXT,
  "deleted_at" TIMESTAMPTZ DEFAULT NULL,
  "created_by" TEXT,
  "updated_by" TEXT,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "videoshowcasesettings" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "settings_key" TEXT DEFAULT 'video-showcase',
  "heading" TEXT DEFAULT 'We Turn Your Raw Footage Into Stories Worth Watching',
  "subheading" TEXT DEFAULT 'From cinematic wedding films and emotional highlights to brand campaigns, reels, and professional post-production — The Editing Table transforms every frame into a polished visual experience designed to connect, engage, and leave a lasting impression.',
  "show_section" BOOLEAN DEFAULT TRUE,
  "show_subheading" BOOLEAN DEFAULT TRUE,
  "alignment" TEXT DEFAULT 'center',
  "heading_color" TEXT DEFAULT '#2F3A2F',
  "text_color" TEXT DEFAULT '#687567',
  "background_color" TEXT DEFAULT '#F8FBF7',
  "section_padding_top" DOUBLE PRECISION DEFAULT 80,
  "section_padding_bottom" DOUBLE PRECISION DEFAULT 80,
  "max_width" DOUBLE PRECISION DEFAULT 1440,
  "autoplay" BOOLEAN DEFAULT TRUE,
  "autoplay_delay" DOUBLE PRECISION DEFAULT 5000,
  "infinite_loop" BOOLEAN DEFAULT TRUE,
  "pause_on_hover" BOOLEAN DEFAULT TRUE,
  "hover_playback" BOOLEAN DEFAULT TRUE,
  "center_autoplay" BOOLEAN DEFAULT TRUE,
  "enable_parallax" BOOLEAN DEFAULT TRUE,
  "animation_duration" DOUBLE PRECISION DEFAULT 0.8,
  "card_radius" DOUBLE PRECISION DEFAULT 24,
  "card_gap" DOUBLE PRECISION DEFAULT 20,
  "shadow_intensity" DOUBLE PRECISION DEFAULT 1,
  "show_arrows" BOOLEAN DEFAULT TRUE,
  "show_pagination" BOOLEAN DEFAULT TRUE,
  "desktop_slides" DOUBLE PRECISION DEFAULT 5,
  "tablet_slides" DOUBLE PRECISION DEFAULT 3,
  "mobile_slides" DOUBLE PRECISION DEFAULT 1,
  "cta_text" TEXT DEFAULT 'Explore Our Portfolio',
  "cta_url" TEXT DEFAULT '/portfolio',
  "cta_visible" BOOLEAN DEFAULT TRUE,
  "cta_new_tab" BOOLEAN DEFAULT FALSE,
  "seo_title" TEXT DEFAULT 'Scroll-Stopping Real Estate Videos',
  "seo_description" TEXT DEFAULT 'Cinematic property walkthroughs, drone films and social media videos.',
  "anchor_id" TEXT DEFAULT 'video-showcase',
  "updated_by" TEXT,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "weddinggalleryitems" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "title" TEXT NOT NULL,
  "category" TEXT DEFAULT 'Portraits',
  "location" TEXT DEFAULT '',
  "couple_names" TEXT DEFAULT '',
  "caption" TEXT DEFAULT '',
  "image" TEXT NOT NULL,
  "cover_image" TEXT DEFAULT '',
  "gallery" JSONB,
  "story_summary" TEXT DEFAULT '',
  "is_featured" BOOLEAN DEFAULT FALSE,
  "order" DOUBLE PRECISION DEFAULT 0,
  "is_published" BOOLEAN DEFAULT TRUE,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "workinghours" (
  "_id" TEXT PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  "day_from" TEXT DEFAULT 'Mon',
  "day_to" TEXT DEFAULT 'Sat',
  "opening_time" TEXT DEFAULT '10:00 AM',
  "closing_time" TEXT DEFAULT '7:00 PM',
  "custom_text" TEXT,
  "closed" BOOLEAN DEFAULT FALSE,
  "order" DOUBLE PRECISION DEFAULT 0,
  "status" TEXT DEFAULT 'active',
  "deleted_at" TIMESTAMPTZ DEFAULT NULL,
  "created_by" TEXT,
  "updated_by" TEXT,
  "__v" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);


CREATE UNIQUE INDEX IF NOT EXISTS "idx_aboutmes_key" ON "aboutmes" ("key" ASC);


CREATE INDEX IF NOT EXISTS "idx_adminactivitylogs_created_at" ON "adminactivitylogs" ("created_at" ASC);


CREATE INDEX IF NOT EXISTS "idx_auditlogs_role" ON "auditlogs" ("role" ASC);

CREATE INDEX IF NOT EXISTS "idx_auditlogs_action" ON "auditlogs" ("action" ASC);

CREATE INDEX IF NOT EXISTS "idx_auditlogs_entity" ON "auditlogs" ("entity" ASC);

CREATE INDEX IF NOT EXISTS "idx_auditlogs_result" ON "auditlogs" ("result" ASC);


CREATE UNIQUE INDEX IF NOT EXISTS "idx_blogposts_slug" ON "blogposts" ("slug" ASC);

CREATE INDEX IF NOT EXISTS "idx_blogposts_category" ON "blogposts" ("category" ASC);

CREATE INDEX IF NOT EXISTS "idx_blogposts_status" ON "blogposts" ("status" ASC);

CREATE INDEX IF NOT EXISTS "idx_blogposts_featured" ON "blogposts" ("featured" ASC);

CREATE INDEX IF NOT EXISTS "idx_blogposts_order" ON "blogposts" ("order" ASC);

CREATE INDEX IF NOT EXISTS "idx_blogposts_published_at" ON "blogposts" ("published_at" DESC);


CREATE UNIQUE INDEX IF NOT EXISTS "idx_brandcollaborations_slug" ON "brandcollaborations" ("slug" ASC);

CREATE INDEX IF NOT EXISTS "idx_brandcollaborations_category" ON "brandcollaborations" ("category" ASC);

CREATE INDEX IF NOT EXISTS "idx_brandcollaborations_featured" ON "brandcollaborations" ("featured" ASC);

CREATE INDEX IF NOT EXISTS "idx_brandcollaborations_published" ON "brandcollaborations" ("published" ASC);


CREATE UNIQUE INDEX IF NOT EXISTS "idx_careerscontents_key" ON "careerscontents" ("key" ASC);


CREATE INDEX IF NOT EXISTS "idx_contactemails_order" ON "contactemails" ("order" ASC);

CREATE INDEX IF NOT EXISTS "idx_contactemails_status" ON "contactemails" ("status" ASC);

CREATE INDEX IF NOT EXISTS "idx_contactemails_deleted_at" ON "contactemails" ("deleted_at" ASC);

CREATE INDEX IF NOT EXISTS "idx_contactemails_status_deleted_at_order" ON "contactemails" ("status" ASC, "deleted_at" ASC, "order" ASC);


CREATE INDEX IF NOT EXISTS "idx_contactoffices_order" ON "contactoffices" ("order" ASC);

CREATE INDEX IF NOT EXISTS "idx_contactoffices_status" ON "contactoffices" ("status" ASC);

CREATE INDEX IF NOT EXISTS "idx_contactoffices_deleted_at" ON "contactoffices" ("deleted_at" ASC);

CREATE INDEX IF NOT EXISTS "idx_contactoffices_status_deleted_at_order" ON "contactoffices" ("status" ASC, "deleted_at" ASC, "order" ASC);


CREATE INDEX IF NOT EXISTS "idx_contactphones_order" ON "contactphones" ("order" ASC);

CREATE INDEX IF NOT EXISTS "idx_contactphones_status" ON "contactphones" ("status" ASC);

CREATE INDEX IF NOT EXISTS "idx_contactphones_deleted_at" ON "contactphones" ("deleted_at" ASC);

CREATE INDEX IF NOT EXISTS "idx_contactphones_status_deleted_at_order" ON "contactphones" ("status" ASC, "deleted_at" ASC, "order" ASC);


CREATE UNIQUE INDEX IF NOT EXISTS "idx_contactsettings_settings_key" ON "contactsettings" ("settings_key" ASC);


CREATE INDEX IF NOT EXISTS "idx_emailotps_user" ON "emailotps" ("user" ASC);

CREATE INDEX IF NOT EXISTS "idx_emailotps_email" ON "emailotps" ("email" ASC);

-- Mongo TTL index idx_emailotps_expires_at: Postgres requires scheduled cleanup using the expires_at column.
CREATE INDEX IF NOT EXISTS "idx_emailotps_expires_at" ON "emailotps" ("expires_at" ASC);


CREATE INDEX IF NOT EXISTS "idx_enquiries_created_at" ON "enquiries" ("created_at" DESC);


CREATE UNIQUE INDEX IF NOT EXISTS "idx_heroslides_slide_key" ON "heroslides" ("slide_key" ASC);

CREATE INDEX IF NOT EXISTS "idx_heroslides_order" ON "heroslides" ("order" ASC);

CREATE INDEX IF NOT EXISTS "idx_heroslides_active" ON "heroslides" ("active" ASC);

CREATE INDEX IF NOT EXISTS "idx_heroslides_status" ON "heroslides" ("status" ASC);

CREATE INDEX IF NOT EXISTS "idx_heroslides_active_order" ON "heroslides" ("active" ASC, "order" ASC);


CREATE INDEX IF NOT EXISTS "idx_jobs_status" ON "jobs" ("status" ASC);

CREATE INDEX IF NOT EXISTS "idx_jobs_status_order_created_at" ON "jobs" ("status" ASC, "order" ASC, "created_at" DESC);


CREATE INDEX IF NOT EXISTS "idx_jobapplications_job_id" ON "jobapplications" ("job_id" ASC);

CREATE INDEX IF NOT EXISTS "idx_jobapplications_status" ON "jobapplications" ("status" ASC);

CREATE INDEX IF NOT EXISTS "idx_jobapplications_status_created_at" ON "jobapplications" ("status" ASC, "created_at" DESC);


CREATE INDEX IF NOT EXISTS "idx_media_category" ON "media" ("category" ASC);


CREATE INDEX IF NOT EXISTS "idx_partners_active_order" ON "partners" ("active" ASC, "order" ASC);


CREATE UNIQUE INDEX IF NOT EXISTS "idx_photoshowcaseitems_slug" ON "photoshowcaseitems" ("slug" ASC);

CREATE INDEX IF NOT EXISTS "idx_photoshowcaseitems_category" ON "photoshowcaseitems" ("category" ASC);

CREATE INDEX IF NOT EXISTS "idx_photoshowcaseitems_order" ON "photoshowcaseitems" ("order" ASC);

CREATE INDEX IF NOT EXISTS "idx_photoshowcaseitems_is_featured" ON "photoshowcaseitems" ("is_featured" ASC);

CREATE INDEX IF NOT EXISTS "idx_photoshowcaseitems_is_active" ON "photoshowcaseitems" ("is_active" ASC);

CREATE INDEX IF NOT EXISTS "idx_photoshowcaseitems_deleted_at" ON "photoshowcaseitems" ("deleted_at" ASC);

CREATE INDEX IF NOT EXISTS "idx_photoshowcaseitems_is_active_deleted_at_order" ON "photoshowcaseitems" ("is_active" ASC, "deleted_at" ASC, "order" ASC);

CREATE INDEX IF NOT EXISTS "idx_photoshowcaseitems_category_is_active" ON "photoshowcaseitems" ("category" ASC, "is_active" ASC);

CREATE INDEX IF NOT EXISTS "idx_photoshowcaseitems_is_featured_is_active" ON "photoshowcaseitems" ("is_featured" ASC, "is_active" ASC);


CREATE UNIQUE INDEX IF NOT EXISTS "idx_photoshowcasesettings_settings_key" ON "photoshowcasesettings" ("settings_key" ASC);


CREATE UNIQUE INDEX IF NOT EXISTS "idx_portfolioitems_slug" ON "portfolioitems" ("slug" ASC);

CREATE INDEX IF NOT EXISTS "idx_portfolioitems_category" ON "portfolioitems" ("category" ASC);

CREATE INDEX IF NOT EXISTS "idx_portfolioitems_is_published" ON "portfolioitems" ("is_published" ASC);


CREATE INDEX IF NOT EXISTS "idx_reviews_project_type" ON "reviews" ("project_type" ASC);

CREATE INDEX IF NOT EXISTS "idx_reviews_rating" ON "reviews" ("rating" ASC);

CREATE INDEX IF NOT EXISTS "idx_reviews_verified" ON "reviews" ("verified" ASC);

CREATE INDEX IF NOT EXISTS "idx_reviews_featured" ON "reviews" ("featured" ASC);

CREATE INDEX IF NOT EXISTS "idx_reviews_status" ON "reviews" ("status" ASC);

CREATE INDEX IF NOT EXISTS "idx_reviews_status_created_at" ON "reviews" ("status" ASC, "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_reviews_status_featured_created_at" ON "reviews" ("status" ASC, "featured" ASC, "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_reviews_email_created_at" ON "reviews" ("email" ASC, "created_at" DESC);


CREATE UNIQUE INDEX IF NOT EXISTS "idx_securitypolicies_key" ON "securitypolicies" ("key" ASC);


CREATE UNIQUE INDEX IF NOT EXISTS "idx_services_slug" ON "services" ("slug" ASC);

CREATE INDEX IF NOT EXISTS "idx_services_category" ON "services" ("category" ASC);

CREATE INDEX IF NOT EXISTS "idx_services_is_published" ON "services" ("is_published" ASC);


CREATE INDEX IF NOT EXISTS "idx_sessions_user" ON "sessions" ("user" ASC);

-- Mongo TTL index idx_sessions_expires_at: Postgres requires scheduled cleanup using the expires_at column.
CREATE INDEX IF NOT EXISTS "idx_sessions_expires_at" ON "sessions" ("expires_at" ASC);

CREATE INDEX IF NOT EXISTS "idx_sessions_user_revoked_at_expires_at" ON "sessions" ("user" ASC, "revoked_at" ASC, "expires_at" ASC);


CREATE UNIQUE INDEX IF NOT EXISTS "idx_sitesettings_key" ON "sitesettings" ("key" ASC);

CREATE INDEX IF NOT EXISTS "idx_sitesettings_group" ON "sitesettings" ("group" ASC);


CREATE UNIQUE INDEX IF NOT EXISTS "idx_teammembers_slug" ON "teammembers" ("slug" ASC);

CREATE INDEX IF NOT EXISTS "idx_teammembers_active" ON "teammembers" ("active" ASC);


CREATE INDEX IF NOT EXISTS "idx_trusteddevices_user" ON "trusteddevices" ("user" ASC);

-- Mongo TTL index idx_trusteddevices_expires_at: Postgres requires scheduled cleanup using the expires_at column.
CREATE INDEX IF NOT EXISTS "idx_trusteddevices_expires_at" ON "trusteddevices" ("expires_at" ASC);

CREATE INDEX IF NOT EXISTS "idx_trusteddevices_user_revoked_at_expires_at" ON "trusteddevices" ("user" ASC, "revoked_at" ASC, "expires_at" ASC);


CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email" ASC);

CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" ("role" ASC);


CREATE INDEX IF NOT EXISTS "idx_videoanalytics_video_id" ON "videoanalytics" ("video_id" ASC);

CREATE INDEX IF NOT EXISTS "idx_videoanalytics_event_type" ON "videoanalytics" ("event_type" ASC);

CREATE INDEX IF NOT EXISTS "idx_videoanalytics_created_at" ON "videoanalytics" ("created_at" ASC);

CREATE INDEX IF NOT EXISTS "idx_videoanalytics_video_id_event_type_created_at" ON "videoanalytics" ("video_id" ASC, "event_type" ASC, "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_videoanalytics_event_type_created_at" ON "videoanalytics" ("event_type" ASC, "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_videoanalytics_session_id_video_id" ON "videoanalytics" ("session_id" ASC, "video_id" ASC);


CREATE UNIQUE INDEX IF NOT EXISTS "idx_videoshowcaseitems_slug" ON "videoshowcaseitems" ("slug" ASC);

CREATE INDEX IF NOT EXISTS "idx_videoshowcaseitems_category" ON "videoshowcaseitems" ("category" ASC);

CREATE INDEX IF NOT EXISTS "idx_videoshowcaseitems_order" ON "videoshowcaseitems" ("order" ASC);

CREATE INDEX IF NOT EXISTS "idx_videoshowcaseitems_is_featured" ON "videoshowcaseitems" ("is_featured" ASC);

CREATE INDEX IF NOT EXISTS "idx_videoshowcaseitems_is_active" ON "videoshowcaseitems" ("is_active" ASC);

CREATE INDEX IF NOT EXISTS "idx_videoshowcaseitems_deleted_at" ON "videoshowcaseitems" ("deleted_at" ASC);

CREATE INDEX IF NOT EXISTS "idx_videoshowcaseitems_is_active_deleted_at_order" ON "videoshowcaseitems" ("is_active" ASC, "deleted_at" ASC, "order" ASC);

CREATE INDEX IF NOT EXISTS "idx_videoshowcaseitems_category_is_active" ON "videoshowcaseitems" ("category" ASC, "is_active" ASC);

CREATE INDEX IF NOT EXISTS "idx_videoshowcaseitems_is_featured_is_active" ON "videoshowcaseitems" ("is_featured" ASC, "is_active" ASC);

CREATE INDEX IF NOT EXISTS "idx_videoshowcaseitems_published_at_expires_at" ON "videoshowcaseitems" ("published_at" ASC, "expires_at" ASC);

CREATE INDEX IF NOT EXISTS "idx_videoshowcaseitems_created_at" ON "videoshowcaseitems" ("created_at" DESC);


CREATE UNIQUE INDEX IF NOT EXISTS "idx_videoshowcasesettings_settings_key" ON "videoshowcasesettings" ("settings_key" ASC);


CREATE INDEX IF NOT EXISTS "idx_weddinggalleryitems_category" ON "weddinggalleryitems" ("category" ASC);

CREATE INDEX IF NOT EXISTS "idx_weddinggalleryitems_is_published" ON "weddinggalleryitems" ("is_published" ASC);


CREATE INDEX IF NOT EXISTS "idx_workinghours_order" ON "workinghours" ("order" ASC);

CREATE INDEX IF NOT EXISTS "idx_workinghours_status" ON "workinghours" ("status" ASC);

CREATE INDEX IF NOT EXISTS "idx_workinghours_deleted_at" ON "workinghours" ("deleted_at" ASC);

CREATE INDEX IF NOT EXISTS "idx_workinghours_status_deleted_at_order" ON "workinghours" ("status" ASC, "deleted_at" ASC, "order" ASC);

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_aboutmes_updated_by') THEN ALTER TABLE "aboutmes" ADD CONSTRAINT "idx_fk_aboutmes_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users" ("_id") ON DELETE SET NULL; END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_adminactivitylogs_admin_id') THEN ALTER TABLE "adminactivitylogs" ADD CONSTRAINT "idx_fk_adminactivitylogs_admin_id" FOREIGN KEY ("admin_id") REFERENCES "users" ("_id") ON DELETE SET NULL; END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_auditlogs_user') THEN ALTER TABLE "auditlogs" ADD CONSTRAINT "idx_fk_auditlogs_user" FOREIGN KEY ("user") REFERENCES "users" ("_id") ON DELETE SET NULL; END IF; END $$;




DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_contactemails_created_by') THEN ALTER TABLE "contactemails" ADD CONSTRAINT "idx_fk_contactemails_created_by" FOREIGN KEY ("created_by") REFERENCES "users" ("_id") ON DELETE SET NULL; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_contactemails_updated_by') THEN ALTER TABLE "contactemails" ADD CONSTRAINT "idx_fk_contactemails_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users" ("_id") ON DELETE SET NULL; END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_contactoffices_created_by') THEN ALTER TABLE "contactoffices" ADD CONSTRAINT "idx_fk_contactoffices_created_by" FOREIGN KEY ("created_by") REFERENCES "users" ("_id") ON DELETE SET NULL; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_contactoffices_updated_by') THEN ALTER TABLE "contactoffices" ADD CONSTRAINT "idx_fk_contactoffices_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users" ("_id") ON DELETE SET NULL; END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_contactphones_created_by') THEN ALTER TABLE "contactphones" ADD CONSTRAINT "idx_fk_contactphones_created_by" FOREIGN KEY ("created_by") REFERENCES "users" ("_id") ON DELETE SET NULL; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_contactphones_updated_by') THEN ALTER TABLE "contactphones" ADD CONSTRAINT "idx_fk_contactphones_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users" ("_id") ON DELETE SET NULL; END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_contactsettings_updated_by') THEN ALTER TABLE "contactsettings" ADD CONSTRAINT "idx_fk_contactsettings_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users" ("_id") ON DELETE SET NULL; END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_emailotps_user') THEN ALTER TABLE "emailotps" ADD CONSTRAINT "idx_fk_emailotps_user" FOREIGN KEY ("user") REFERENCES "users" ("_id") ON DELETE CASCADE; END IF; END $$;




DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_jobapplications_job_id') THEN ALTER TABLE "jobapplications" ADD CONSTRAINT "idx_fk_jobapplications_job_id" FOREIGN KEY ("job_id") REFERENCES "jobs" ("_id") ON DELETE SET NULL; END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_media_uploaded_by') THEN ALTER TABLE "media" ADD CONSTRAINT "idx_fk_media_uploaded_by" FOREIGN KEY ("uploaded_by") REFERENCES "users" ("_id") ON DELETE SET NULL; END IF; END $$;


DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_photoshowcaseitems_created_by') THEN ALTER TABLE "photoshowcaseitems" ADD CONSTRAINT "idx_fk_photoshowcaseitems_created_by" FOREIGN KEY ("created_by") REFERENCES "users" ("_id") ON DELETE SET NULL; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_photoshowcaseitems_updated_by') THEN ALTER TABLE "photoshowcaseitems" ADD CONSTRAINT "idx_fk_photoshowcaseitems_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users" ("_id") ON DELETE SET NULL; END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_photoshowcasesettings_updated_by') THEN ALTER TABLE "photoshowcasesettings" ADD CONSTRAINT "idx_fk_photoshowcasesettings_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users" ("_id") ON DELETE SET NULL; END IF; END $$;



DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_securitypolicies_updated_by') THEN ALTER TABLE "securitypolicies" ADD CONSTRAINT "idx_fk_securitypolicies_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users" ("_id") ON DELETE SET NULL; END IF; END $$;


DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_sessions_user') THEN ALTER TABLE "sessions" ADD CONSTRAINT "idx_fk_sessions_user" FOREIGN KEY ("user") REFERENCES "users" ("_id") ON DELETE CASCADE; END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_sitesettings_updated_by') THEN ALTER TABLE "sitesettings" ADD CONSTRAINT "idx_fk_sitesettings_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users" ("_id") ON DELETE SET NULL; END IF; END $$;


DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_trusteddevices_user') THEN ALTER TABLE "trusteddevices" ADD CONSTRAINT "idx_fk_trusteddevices_user" FOREIGN KEY ("user") REFERENCES "users" ("_id") ON DELETE CASCADE; END IF; END $$;


DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_videoanalytics_video_id') THEN ALTER TABLE "videoanalytics" ADD CONSTRAINT "idx_fk_videoanalytics_video_id" FOREIGN KEY ("video_id") REFERENCES "videoshowcaseitems" ("_id") ON DELETE CASCADE; END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_videoshowcaseitems_created_by') THEN ALTER TABLE "videoshowcaseitems" ADD CONSTRAINT "idx_fk_videoshowcaseitems_created_by" FOREIGN KEY ("created_by") REFERENCES "users" ("_id") ON DELETE SET NULL; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_videoshowcaseitems_updated_by') THEN ALTER TABLE "videoshowcaseitems" ADD CONSTRAINT "idx_fk_videoshowcaseitems_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users" ("_id") ON DELETE SET NULL; END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_videoshowcasesettings_updated_by') THEN ALTER TABLE "videoshowcasesettings" ADD CONSTRAINT "idx_fk_videoshowcasesettings_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users" ("_id") ON DELETE SET NULL; END IF; END $$;


DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_workinghours_created_by') THEN ALTER TABLE "workinghours" ADD CONSTRAINT "idx_fk_workinghours_created_by" FOREIGN KEY ("created_by") REFERENCES "users" ("_id") ON DELETE SET NULL; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_fk_workinghours_updated_by') THEN ALTER TABLE "workinghours" ADD CONSTRAINT "idx_fk_workinghours_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users" ("_id") ON DELETE SET NULL; END IF; END $$;

COMMIT;
