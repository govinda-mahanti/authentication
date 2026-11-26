import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGO_URI);

    console.log(`Database connected: ${connection.connection.name}`);
  } catch (err) {
    console.error("Failed to connect to database:", err.message);
    process.exit(1);
  }
};
