import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import connectDB from "./config/db.js";

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// ----------------------------
//  Middleware
// ----------------------------
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN, 
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Optional: Morgan logger for dev mode
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ----------------------------
// Health Check (required for Render)
// ----------------------------
app.get("/", (req, res) => {
  res.send("Plantify Backend is running!");
});

// ----------------------------
// 📦 Import Routes
// ----------------------------
import userRoutes from "./Routes/UserRouts.js";
import productRoutes from "./Routes/productRoutes.js";
import cartRoutes from "./Routes/cartRoutes.js";
import orderRoutes from "./Routes/orderRoutes.js";
import MLRoutes from "./Routes/MLRout.js";

// ----------------------------
// Mount Routes
// ----------------------------
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/ml", MLRoutes);

// ----------------------------
// Global Error Handling
// ----------------------------
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Server Error occurred",
  });
});

// ----------------------------
//  Start Server
// ----------------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
