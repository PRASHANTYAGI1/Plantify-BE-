import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import connectDB from "./config/db.js";

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();
// db connected automatically on import*****************

// Initialize Express app
const app = express();

// ----------------------------
// 🧩 Middleware
// ----------------------------
app.use(cors({
  origin: "http://localhost:5173", // frontend origin
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true, // allow cookies/auth headers
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Optional: Morgan logger for dev mode
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ----------------------------
// 📦 Import Routes (to be implemented)
// ----------------------------
import userRoutes from "./Routes/UserRouts.js";
import productRoutes from "./Routes/productRoutes.js";
import cartRoutes from "./Routes/cartRoutes.js";
// import wishlistRoutes from "./Routes/wishlistRoutes.js";
import orderRoutes from "./Routes/orderRoutes.js";
import MLRoutes from "./Routes/MLRout.js";
// import diseaseDetectionRoutes from "./routes/diseaseDetectionRoutes.js";

// ----------------------------
// 🚏 Mount Routes
// ----------------------------
app.use("/api/v1/users", userRoutes);               // register, login, profile, forgot password, etc.
app.use("/api/v1/products", productRoutes);         // CRUD operations for products
app.use("/api/v1/cart", cartRoutes);                // Add/remove/view items in cart
// app.use("/api/v1/wishlist", wishlistRoutes);        // Add/remove/view wishlist items
app.use("/api/v1/orders", orderRoutes);             // Create, view, update order status
app.use("/api/v1/ml", MLRoutes);
// app.use("/api/disease-detection", diseaseDetectionRoutes); // Upload image, detect disease, suggestions

// ----------------------------
// Global Error Handling
// ----------------------------
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Server Error occurred while processing your request (this is a global error handler)",
  });
});

// ----------------------------
// 🚀 Start Server
// ----------------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
});
