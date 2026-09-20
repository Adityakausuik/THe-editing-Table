import mongoose from "mongoose";

async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/the-editing-table");
  const db = mongoose.connection.db;

  console.log("Cleaning 'contactoffices'...");
  await db.collection("contactoffices").updateMany(
    { officeName: /studio/i },
    { $set: { officeName: "Mohali Office" } }
  );

  console.log("Cleaning 'services'...");
  const services = await db.collection("services").find({}).toArray();
  for (const s of services) {
    if (Array.isArray(s.features)) {
      const newFeatures = s.features.map(f => f.replace(/Studio /gi, ""));
      await db.collection("services").updateOne(
        { _id: s._id },
        { $set: { features: newFeatures } }
      );
    }
  }

  console.log("Cleaning 'partners'...");
  await db.collection("partners").updateMany(
    { category: /Editorial Film Studio/i },
    { $set: { category: "Editorial Film House" } }
  );
  await db.collection("partners").updateMany(
    { name: /Vogue Lumière Studio/i },
    { $set: { name: "Vogue Lumière House" } }
  );
  await db.collection("partners").updateMany(
    { name: /Pacific Harbor Studios/i },
    { $set: { name: "Pacific Harbor Films" } }
  );

  console.log("Cleaning 'contactemails'...");
  await db.collection("contactemails").updateMany(
    { label: /Primary Studio Email/i },
    { $set: { label: "Primary Email" } }
  );

  console.log("Cleaning 'sitesettings'...");
  await db.collection("sitesettings").updateOne(
    { key: "metaTitle" },
    { $set: { value: "The Editing Table | High-End Post-Production" } }
  );
  await db.collection("sitesettings").updateOne(
    { key: "metaDescription" },
    { $set: { value: "Bespoke color grading, photo retouching, and film editing for wedding filmmakers and commercial creators worldwide." } }
  );

  console.log("Cleaning 'careerscontents'...");
  const careers = await db.collection("careerscontents").find({}).toArray();
  for (const c of careers) {
    let hero = c.hero || {};
    if (hero.badge) hero.badge = hero.badge.replace(/STUDIO/g, "TEAM");
    if (hero.description) hero.description = hero.description.replace(/studios/g, "creators");

    let whyJoinUs = (c.whyJoinUs || []).map(card => {
      let desc = card.description || "";
      desc = desc.replace(/studio flexibility/g, "flexible schedules");
      desc = desc.replace(/rapidly expanding studio/g, "rapidly expanding team");
      return { ...card, description: desc };
    });

    await db.collection("careerscontents").updateOne(
      { _id: c._id },
      { $set: { hero, whyJoinUs } }
    );
  }

  console.log("Cleaning 'jobs'...");
  const jobs = await db.collection("jobs").find({}).toArray();
  for (const j of jobs) {
    let loc = (j.location || "").replace(/Studio \/ Hybrid/g, "Onsite / Hybrid");
    let resp = (j.responsibilities || []).map(r => 
      r.replace(/DaVinci Resolve Studio/g, "DaVinci Resolve")
       .replace(/proprietary studio LUTs/g, "proprietary creative LUTs")
    );
    let reqSkills = (j.requiredSkills || []).map(s => s.replace(/DaVinci Resolve Studio/g, "DaVinci Resolve"));
    let benefits = (j.benefits || []).map(b =>
      b.replace(/artist-first studio environment/g, "artist-first work environment")
       .replace(/low-stress studio atmosphere/g, "low-stress team atmosphere")
    );

    await db.collection("jobs").updateOne(
      { _id: j._id },
      { $set: { location: loc, responsibilities: resp, requiredSkills: reqSkills, benefits } }
    );
  }

  console.log("Cleaning 'teammembers' if any...");
  const team = await db.collection("teammembers").find({}).toArray();
  for (const t of team) {
    let changed = false;
    let update = {};
    for (const [k, v] of Object.entries(t)) {
      if (typeof v === "string" && /studio/i.test(v)) {
        update[k] = v.replace(/studio/gi, "creative");
        changed = true;
      }
    }
    if (changed) {
      await db.collection("teammembers").updateOne({ _id: t._id }, { $set: update });
    }
  }

  console.log("DONE! Re-scanning to verify...");
  const collections = await db.listCollections().toArray();
  let remaining = 0;
  for (const col of collections) {
    const docs = await db.collection(col.name).find({}).toArray();
    for (const d of docs) {
      const json = JSON.stringify(d);
      if (/studio/i.test(json)) {
        console.log(`[Remaining in ${col.name}]`, json);
        remaining++;
      }
    }
  }

  if (remaining === 0) {
    console.log("VERIFIED: Zero occurrences of 'studio' remain in MongoDB!");
  } else {
    console.log(`WARNING: ${remaining} occurrences remain!`);
  }

  process.exit(0);
}

run().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
