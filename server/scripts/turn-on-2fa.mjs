import mongoose from "mongoose";

await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/the-editing-table");

await mongoose.connection.db.collection("securitypolicies").updateOne(
  { key: "global" },
  { $set: { requireAdmin2FA: true } },
  { upsert: true }
);

console.log("Updated SecurityPolicy requireAdmin2FA: true");
const policy = await mongoose.connection.db.collection("securitypolicies").findOne({ key: "global" });
console.log("Current policy:", {
  requireAdmin2FA: policy.requireAdmin2FA,
  requireUser2FA: policy.requireUser2FA
});

await mongoose.disconnect();
