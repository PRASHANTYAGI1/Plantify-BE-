import express from "express";
import { isAuthenticated, isAdmin } from "../Middleware/auth.js";
import {
  placeOrder,
  getBuyerOrders,
  getSellerOrders,
  updateOrderItemStatus,
  getOrderById,
  getAllOrdersAdmin,
  deleteOrderByBuyer
} from "../controllers/OrderController.js";

const router = express.Router();

// -------------------------------
// Order Routes
// -------------------------------

// Place a new order (buyer only)
router.post("/", isAuthenticated, placeOrder);

// Delete an order by ID (buyer only)
router.delete("/remove/:orderId", isAuthenticated, deleteOrderByBuyer);

// Get all orders for the logged-in buyer
router.get("/my-orders", isAuthenticated, getBuyerOrders);

// Get orders for logged-in seller (items sold by them)
router.get("/seller-orders", isAuthenticated, getSellerOrders);

// Update item status for seller
router.put(
  "/:orderId/item/:itemId/status",
  isAuthenticated,
  updateOrderItemStatus
);

// Get a single order by ID (buyer or seller)
router.get("/:orderId", isAuthenticated, getOrderById);

// Admin route to get all orders
router.get("/admin/all", isAuthenticated, isAdmin, getAllOrdersAdmin);

export default router;
