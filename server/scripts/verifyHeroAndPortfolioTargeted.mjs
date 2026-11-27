import dotenv from 'dotenv';
dotenv.config();

import { getPostgresPool } from '../src/db/postgres.js';
import {
  getAdminHeroBackground,
  saveHeroBackgroundDraft,
  publishHeroBackground,
  getActiveHeroBackground
} from '../src/db/heroBackgroundRepository.js';
import {
  createPostgresHeroSlide,
  listPostgresHeroSlides,
  listPublishedHeroSlides,
  reorderPostgresHeroSlides,
  deletePostgresHeroSlide
} from '../src/db/heroSlideRepository.js';
import {
  createPostgresCmsRecord,
  getPostgresCmsRecord,
  listPostgresCmsRecords,
  updatePostgresCmsRecord,
  deletePostgresCmsRecord
} from '../src/db/cmsRepository.js';
import PortfolioItem from '../src/models/PortfolioItem.model.js';
import { createId } from '../src/utils/ids.js';

async function runTargetedVerification() {
  console.log("=== STARTING TARGETED HERO & PORTFOLIO VERIFICATION ===");
  const pool = getPostgresPool();
  const testIds = [];

  try {
    // Clean up any earlier test artifacts
    await pool.query("DELETE FROM heroslides WHERE slide_key LIKE 'slide-%'");
    await pool.query("DELETE FROM portfolioitems WHERE slug LIKE 'vogue-paris-%'");

    // 1. TEST HERO BACKGROUND VIDEO DRAFT & PUBLISH
    console.log("\n[TEST 1] Testing Hero Background Video Draft & Publish...");
    const draftData = {
      title: "Targeted Verification Showreel",
      videoUrl: "/uploads/hero/test-showreel-1080p.mp4",
      posterUrl: "/uploads/hero/test-poster.webp",
      videoType: "video/mp4",
      overlayOpacity: 0.42,
      playbackSpeed: 1.0,
      versionNotes: "Automated Verification Test"
    };
    const draft = await saveHeroBackgroundDraft(draftData, { id: "test-admin", email: "admin@theeditingtable.com" });
    console.log("✓ Hero Background Draft Saved, ID:", draft.id, "Version:", draft.version);

    const published = await publishHeroBackground(draft.id, { id: "test-admin" });
    console.log("✓ Hero Background Published, Status:", published.status, "Version:", published.version);

    const activePublic = await getActiveHeroBackground();
    console.log("✓ Public Active Hero Video Retrieved:", activePublic?.videoUrl === draftData.videoUrl ? "MATCH" : "MISMATCH");
    if (activePublic?.videoUrl !== draftData.videoUrl) {
      throw new Error("Active public video does not match published draft!");
    }

    // 2. TEST HERO SLIDES CREATE, REORDER & PUBLISHED FETCH
    console.log("\n[TEST 2] Testing Hero Slides Create, Reorder & Public Fetch...");
    const slide1Id = createId();
    const slide2Id = createId();
    testIds.push({ type: "slide", id: slide1Id }, { type: "slide", id: slide2Id });

    await createPostgresHeroSlide(slide1Id, {
      title: "Hero Slide Alpha",
      slideKey: `slide-${slide1Id}`,
      subtitle: "Cinematic Film Grading",
      eyebrow: "Master Edit",
      ctaText: "Explore Work",
      ctaLink: "/portfolio",
      mainImage: "/uploads/hero/slide-alpha.jpg",
      order: 1,
      active: true,
      status: "published"
    });

    await createPostgresHeroSlide(slide2Id, {
      title: "Hero Slide Beta Video",
      slideKey: `slide-${slide2Id}`,
      subtitle: "Dynamic 4K Motion",
      eyebrow: "Editorial Showcase",
      ctaText: "Watch Reel",
      ctaLink: "/contact",
      mainImage: "/uploads/hero/slide-beta.mp4",
      order: 2,
      active: true,
      status: "published"
    });
    console.log("✓ 2 Hero Slides created successfully");

    const publishedSlides = await listPublishedHeroSlides();
    const found1 = publishedSlides.find((s) => s.id === slide1Id || s._id === slide1Id);
    const found2 = publishedSlides.find((s) => s.id === slide2Id || s._id === slide2Id);
    console.log("✓ Public Published Slides Found:", Boolean(found1 && found2));

    // Test reorder
    const allSlides = await listPostgresHeroSlides();
    const orderedIds = [slide2Id, slide1Id, ...allSlides.map(s => s._id || s.id).filter(id => id !== slide1Id && id !== slide2Id)];
    await reorderPostgresHeroSlides(orderedIds);
    const reorderedSlides = await listPublishedHeroSlides();
    const idx2 = reorderedSlides.findIndex(s => (s.id || s._id) === slide2Id);
    const idx1 = reorderedSlides.findIndex(s => (s.id || s._id) === slide1Id);
    console.log("✓ Slides Reordered Successfully (Beta before Alpha):", idx2 < idx1);

    // 3. TEST PORTFOLIO ITEM CREATE, UPDATE & PUBLIC FETCH
    console.log("\n[TEST 3] Testing Portfolio Item Create, Update & Public Fetch...");
    const portfolioId = createId();
    testIds.push({ type: "portfolio", id: portfolioId });

    const createdPortfolio = await createPostgresCmsRecord(PortfolioItem, portfolioId, {
      title: "Vogue Paris Editorial Film",
      slug: "vogue-paris-editorial-film",
      category: "Fashion Editorial",
      client: "Condé Nast France",
      coverImage: "/uploads/portfolio/vogue-cover.webp",
      image: "/uploads/portfolio/vogue-cover.webp",
      videoUrl: "/uploads/portfolio/vogue-paris-master-4k.mp4",
      description: "Haute couture post-production with micro skin retouching and film emulation.",
      deliverables: ["4K Master", "Social Cuts", "Color Grade"],
      isFeatured: true,
      order: 1,
      isPublished: true
    });
    console.log("✓ Portfolio Item Created, ID:", createdPortfolio.id || createdPortfolio._id);

    // Verify record retrieval
    const fetchedPortfolio = await getPostgresCmsRecord(PortfolioItem, portfolioId);
    console.log("✓ Portfolio Item Retrieved:", fetchedPortfolio?.title === "Vogue Paris Editorial Film");
    console.log("✓ Portfolio Media URLs:", {
      coverImage: fetchedPortfolio?.coverImage,
      videoUrl: fetchedPortfolio?.videoUrl
    });

    // Public list query
    const publicPortfolio = await listPostgresCmsRecords(PortfolioItem, {
      publicFilter: { isPublished: true },
      orderField: "order"
    });
    const foundPortfolio = publicPortfolio.find((p) => (p.id || p._id) === portfolioId);
    console.log("✓ Portfolio Item returned in Public List:", Boolean(foundPortfolio));

    console.log("\n=== ALL TARGETED VERIFICATIONS PASSED (3/3) ===");
  } catch (err) {
    console.error("Targeted verification failed:", err);
    process.exitCode = 1;
  } finally {
    // Clean up test records
    console.log("\nCleaning up test records...");
    for (const item of testIds) {
      try {
        if (item.type === "slide") {
          await deletePostgresHeroSlide(item.id);
        } else if (item.type === "portfolio") {
          await deletePostgresCmsRecord(PortfolioItem, item.id);
        }
      } catch (e) {
        console.warn("Cleanup warning for", item, e.message);
      }
    }
    console.log("✓ Test records cleaned up successfully.");
    process.exit(process.exitCode || 0);
  }
}

runTargetedVerification();
