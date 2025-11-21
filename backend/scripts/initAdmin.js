import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

const initAdmin = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to database");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: "Company" });
    if (existingAdmin) {
      console.log("Admin user already exists");
      process.exit(0);
    }

    // Create default admin user
    const hashedPassword = await bcrypt.hash("admin123", 12);
    
    const admin = new User({
      role: "Company",
      name: "Admin",
      username: "admin",
      password: hashedPassword,
      isActive: true
    });

    await admin.save();
    console.log("Default admin user created:");
    console.log("Username: admin");
    console.log("Password: admin123");
    
  } catch (error) {
    console.error("Error creating admin user:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

initAdmin();
