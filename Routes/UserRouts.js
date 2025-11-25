import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  uploadProfileImage,
  forgotPassword,
  resetPassword,
  getAllUsers,
  deleteUser,
  updateUserRole,
} from "../controllers/UserController.js";

import upload from "../Middleware/uploadMiddleware.js";
import { isAuthenticated, isAdmin } from "../Middleware/auth.js";
const router = express.Router();

// -------------------------------
// 🧍 User Authentication Routes
// -------------------------------

// Register a new user
router.post("/register", registerUser);

// Login user
router.post("/login", loginUser);

// Logout user
router.post("/logout", logoutUser);

// -------------------------------
// 👤 Profile Management
// -------------------------------

// Get current user profile (protected)
router.get("/profile", isAuthenticated, getUserProfile);

// Update user profile details (protected)
router.put("/profile",isAuthenticated, updateUserProfile);

// Upload profile image
router.put("/profile/upload", isAuthenticated, upload.single("profileImage"), uploadProfileImage);



// -------------------------------
// 🔒 Password Management
// -------------------------------

// Forgot password - generates reset token and sends reset link
router.post("/forgot-password", forgotPassword);

// Reset password using the token
router.put("/reset-password/:token", resetPassword);

// -------------------------------
// 🧑‍💼 Admin Routes
// -------------------------------

// Get all users (admin only)
router.get("/all", isAuthenticated, isAdmin, getAllUsers);
router.delete("/:id", isAuthenticated, isAdmin, deleteUser);
router.put("/role/:id", isAuthenticated, isAdmin, updateUserRole);

export default router;