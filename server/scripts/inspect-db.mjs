import mongoose from "mongoose";
import User from "../src/models/User.model.js";
import SecurityPolicy from "../src/models/SecurityPolicy.model.js";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/the-editing-table";

try {
  await mongoose.connect(uri);
  console.log("=== DATABASE CONNECTION ===");
  console.log("Host:", mongoose.connection.host);
  console.log("Database Name:", mongoose.connection.name);
  console.log("ReadyState:", mongoose.connection.readyState === 1 ? "1 (Connected)" : mongoose.connection.readyState);

  console.log("\n=== USERS IN DATABASE ===");
  const users = await User.find({}).lean();
  console.log(`Total users found: ${users.length}`);
  for (const u of users) {
    console.log(`- Email: ${u.email}`);
    console.log(`  Name: ${u.name}`);
    console.log(`  Role: ${u.role}`);
    console.log(`  isActive: ${u.isActive}`);
    console.log(`  Failed attempts: ${u.failedPasswordAttempts || 0}`);
    console.log(`  Account locked until: ${u.accountLockUntil || "Not locked"}`);
    console.log(`  TwoFactor:`, JSON.stringify(u.twoFactor));
    console.log(`  ForceSecuritySetup: ${u.forceSecuritySetup}`);
  }

  console.log("\n=== SECURITY POLICY ===");
  const policy = await SecurityPolicy.findOne({ key: "global" }).lean();
  if (policy) {
    console.log(`- requireAdmin2FA: ${policy.requireAdmin2FA}`);
    console.log(`- requireUser2FA: ${policy.requireUser2FA}`);
    console.log(`- maxFailedAttempts: ${policy.maxFailedAttempts}`);
    console.log(`- lockMinutes: ${policy.lockMinutes}`);
    console.log(`- sessionExpiryHours: ${policy.sessionExpiryHours}`);
  } else {
    console.log("No global security policy found.");
  }

  console.log("\n=== COLLECTIONS SUMMARY ===");
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const col of collections) {
    const count = await mongoose.connection.db.collection(col.name).countDocuments();
    console.log(`  ${col.name.padEnd(26)} : ${count} items`);
  }

  await mongoose.disconnect();
} catch (err) {
  console.error("Database connection error:", err.message);
}
