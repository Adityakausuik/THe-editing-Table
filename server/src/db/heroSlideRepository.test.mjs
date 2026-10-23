import assert from "node:assert/strict";
import { test } from "node:test";
import { fromPostgresHeroSlide, reorderPostgresHeroSlides } from "./heroSlideRepository.js";

test("Hero Slide rows map nested-array columns to the API shape", () => {
  const slide = fromPostgresHeroSlide({
    _id: "slide-id",
    slide_number: 2,
    slide_key: "ceo",
    slide_type: "ceo",
    layout_type: "ceo_editorial",
    heading_lines: ["A story", "well told"],
    feature_items: ["Color", "Edit"],
    images: ["/a.jpg"],
    image_grid: ["/a.jpg"],
    cta_text: "Explore",
    cta_link: "/about",
    featured_image_index: 0,
    transition_duration: 5000,
    order: 2,
    active: true,
    status: "published",
    __v: 1
  });

  assert.equal(slide.slideKey, "ceo");
  assert.deepEqual(slide.headingLines, ["A story", "well told"]);
  assert.deepEqual(slide.featureItems, ["Color", "Edit"]);
  assert.deepEqual(slide.imageGrid, ["/a.jpg"]);
  assert.equal(slide.ctaText, "Explore");
  assert.equal(slide.transitionDuration, 5000);
});

test("Hero Slide reordering updates order and slide number atomically", async () => {
  const calls = [];
  let released = false;
  const client = {
    async query(text, values) {
      calls.push({ text, values });
      if (text.startsWith('SELECT "_id"')) return { rowCount: 2, rows: [{ _id: "one" }, { _id: "two" }] };
      if (text.startsWith('SELECT *')) return { rowCount: 2, rows: [] };
      return { rowCount: 1, rows: [] };
    },
    release() { released = true; }
  };
  const pool = { connect: async () => client };

  await reorderPostgresHeroSlides(["one", "two"], pool);

  assert.equal(calls[0].text, "BEGIN");
  assert.deepEqual(calls[1].values, [["one", "two"]]);
  assert.deepEqual(calls[2].values, [1, "one"]);
  assert.match(calls[2].text, /"order" = \$1, "slide_number" = \$1/);
  assert.deepEqual(calls[3].values, [2, "two"]);
  assert.equal(calls.at(-1).text, "COMMIT");
  assert.equal(released, true);
});
