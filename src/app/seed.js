const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// 1. Apni MongoDB URI yahan dalein
const MONGODB_URI = "mongodb://127.0.0.1:27017/schooldb";

async function createSuperAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Database connected...");

    // 2. Password ko hash karein
    const hashedPassword = await bcrypt.hash("admin123", 10); // Password 'admin123' hoga

    const superAdminData = {
      name: "Super Admin",
      email: "admin@system.com",
      password: hashedPassword,
      role: "super_admin",
      schoolId: null,
    };

    // 3. User collection mein insert karein
    // Agar User model import nahi ho raha to direct collection use karein
    const db = mongoose.connection.db;
    await db.collection("users").insertOne(superAdminData);

    console.log("✅ Super Admin created successfully!");
    console.log("Email: admin@system.com");
    console.log("Password: admin123");

    process.exit();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createSuperAdmin();
