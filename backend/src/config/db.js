
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

mongoose.set("strictQuery", true);
mongoose.set("bufferCommands", true);

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI not defined in .env");
  }

  try {
    await mongoose.connect(uri, {
      // timeout set 
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });

    isConnected = true;
    console.info("[DB] MongoDB connected");
  } catch (err) {
    console.error("[DB ERROR] Could not connect to MongoDB:", err.message);
    throw err;
  }
};

export default connectDB;
