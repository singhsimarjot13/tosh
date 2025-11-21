import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../models/User.js"; // adjust the path to your User model

dotenv.config();

export const connectDB = async () => {
  try {
    // Connect only if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("MongoDB connected");
    }

    // Ensure default admin exists
    const existingAdmin = await User.findOne({ role: "Company" });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 12);
      const admin = new User({
        role: "Company",
        name: "Admin",
        username: "admin",
        password: hashedPassword,
        isActive: true
      });
      await admin.save();
      console.log("Default admin user created automatically");
      console.log("Username: admin | Password: admin123");
    } else {
      console.log("Admin user already exists");
    }

  } catch (err) {
    console.error("Database connection or admin creation error:", err);
    process.exit(1); // exit only if DB connection fails
  }
};
