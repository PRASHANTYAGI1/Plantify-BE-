import express from "express";
import { isAuthenticated } from "../Middleware/auth.js";
import {
  addToCart,
  removeFromCart,
  updateCartItemQuantity,
  getCart
} from "../controllers/CartController.js";

const router = express.Router();

// -------------------------------
// 🛒 Cart Routes
// -------------------------------

// 1️⃣ Add a product to cart (buyer only)
router.post("/add", isAuthenticated, addToCart);

// 2️⃣ Remove a product from cart (buyer only)
router.delete("/remove/:productId", isAuthenticated, removeFromCart);

// 3️⃣ Update quantity of a cart item (buyer only)
router.put("/update/:productId", isAuthenticated, updateCartItemQuantity);

// 4️⃣ Get the current user's cart (buyer only)
router.get("/", isAuthenticated, getCart);

export default router;
