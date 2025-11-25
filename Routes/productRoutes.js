// routes/productRoutes.js
import express from "express";
import upload from "../Middleware/uploadMiddleware.js";
import { isAuthenticated, isAdmin } from "../Middleware/auth.js";

// Import controller functions (to be created later)
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getAllProductsAdmin,
  getSellerProducts
} from "../controllers/ProductController.js";

const router = express.Router();

// -------------------------------
// 🛒 Product CRUD Routes
// -------------------------------

// 1️⃣ Create a new product (seller only)
router.post(
  "/",
  isAuthenticated,
  upload.array("images", 5),
  createProduct
);

// 2️⃣ Get all products (buyer or seller)
router.get("/", getAllProducts);


// GET /api/v1/products/seller - get products of current logged-in seller
router.get("/seller", isAuthenticated, getSellerProducts);

// 3️⃣ Get a single product by ID
router.get("/:id", getProductById);

// 4️⃣ Update a product (seller only)
router.put(
  "/:id",
  isAuthenticated,
  upload.array("images", 5),
  updateProduct
);

// 5️⃣ Delete a product (seller only)
router.delete("/:id", isAuthenticated, deleteProduct);

// 6️⃣ Admin route to get all products
router.get("/admin/all", isAuthenticated, isAdmin, getAllProductsAdmin);

export default router;
