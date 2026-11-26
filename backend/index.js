
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRouts.js";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json());
app.use(cookieParser());

// app.use(
//   cors({
//     origin: process.env.ORIGIN,
//     credentials: true,
//   })
// );


app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  })
);

app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Server is Running...");
});

connectDB();

app.listen(process.env.PORT, () => {
  console.log(`Server running at ${process.env.PORT}`);
});
