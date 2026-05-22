const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

// .env.local se URI load karo
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error(
      "❌ .env.local file nahi mili! Seed file ke saath same folder mein honi chahiye.",
    );
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const val = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI .env.local mein nahi mili!");
  process.exit(1);
}

async function createSuperAdmin() {
  try {
    console.log("🔗 MongoDB Atlas se connect ho raha hai...");
    console.log("URI:", MONGODB_URI.replace(/:([^@]+)@/, ":****@")); // password hide karo

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Database connected!");

    const db = mongoose.connection.db;

    // Pehle check karo ke super_admin already hai ya nahi
    const existing = await db
      .collection("users")
      .findOne({ email: "admin@system.com" });

    if (existing) {
      console.log(
        "⚠️  Super Admin pehle se maujood hai (email: admin@system.com)",
      );
      console.log("   Agar password reset karna hai to --force flag use karo:");
      console.log("   node seed.js --force");

      if (!process.argv.includes("--force")) {
        process.exit(0);
      }

      // Force mode: purana delete karo
      await db.collection("users").deleteOne({ email: "admin@system.com" });
      console.log(
        "🗑️  Purana Super Admin delete kar diya, naya bana raha hai...",
      );
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);

    const superAdminData = {
      name: "Super Admin",
      email: "admin@system.com",
      password: hashedPassword,
      role: "super_admin",
      schoolId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("users").insertOne(superAdminData);

    console.log("\n✅ Super Admin successfully ban gaya!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Email:    admin@system.com");
    console.log("🔑 Password: admin123");
    console.log("🆔 ID:", result.insertedId.toString());
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error aaya:", error.message);

    if (error.message.includes("ECONNREFUSED")) {
      console.error(
        "💡 Local MongoDB band hai. Aap Atlas use kar rahe hain — .env.local check karo.",
      );
    } else if (error.message.includes("Authentication failed")) {
      console.error(
        "💡 Atlas username/password galat hai. Connection string check karo.",
      );
    } else if (
      error.message.includes("IP") ||
      error.message.includes("whitelist")
    ) {
      console.error(
        "💡 Aapka IP Atlas mein allow nahi. Atlas > Network Access > Add IP Address karo.",
      );
    }

    process.exit(1);
  }
}

createSuperAdmin();
