import mongoose from "mongoose";

async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/the-editing-table");
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  
  console.log("--- SCANNING MONGODB FOR 'studio' ---");
  for (const c of collections) {
    const docs = await db.collection(c.name).find({}).toArray();
    for (const d of docs) {
      const json = JSON.stringify(d);
      if (/studio/i.test(json)) {
        console.log(`[Collection: ${c.name}] _id: ${d._id}`);
        for (const [k, v] of Object.entries(d)) {
          const valStr = JSON.stringify(v);
          if (/studio/i.test(valStr)) {
            console.log(`   ${k}: ${valStr}`);
          }
        }
      }
    }
  }
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
