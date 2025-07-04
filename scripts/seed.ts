import connectToDatabase from "../lib/mongodb";
import User from "../models/User";

async function seed() {
  try {
    await connectToDatabase();
    console.log("Connected to MongoDB");

    // Check if admin user already exists
    const adminExists = await User.findOne({ email: "admin@hsse.com" });
    
    if (!adminExists) {
      // Create admin user
      const admin = await User.create({
        name: "System Administrator",
        email: "admin@hsse.com",
        password: "admin123", // Change this in production!
        role: "ADMIN",
      });
      console.log("Admin user created:", admin.email);
    } else {
      console.log("Admin user already exists");
    }

    // Create test officer if doesn't exist
    const officerExists = await User.findOne({ email: "officer@hsse.com" });
    
    if (!officerExists) {
      const officer = await User.create({
        name: "HSSE Officer",
        email: "officer@hsse.com",
        password: "officer123", // Change this in production!
        role: "OFFICER",
      });
      console.log("Officer user created:", officer.email);
    } else {
      console.log("Officer user already exists");
    }

    console.log("Seeding completed!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
}

seed();