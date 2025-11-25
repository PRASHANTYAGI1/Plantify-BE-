import User from "../Models/UserModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import cloudinary from "../config/cloudnary.js";
import { uploadToCloudinary } from "../Middleware/uploadMiddleware.js"; // Assuming you have a utility for cloud uploads

// -------------------------------
// REGISTER USER
// -------------------------------
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists. Please login.",
      });
    }

    // Create new user (password hashed via pre-save hook)
    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: role.toLowerCase() || "buyer",
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully.",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration.",
    });
  }
};

// -------------------------------
// LOGIN USER
// -------------------------------
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Find user and include password
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password"
    );
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Email not registered. Please sign up first.",
      });
    }

    // Validate password using schema method
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Set token in HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "User logged in successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImageId: user.profileImageId,
        token,
      },
      token,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login.",
    });
  }
};

// -------------------------------
// LOGOUT USER
// -------------------------------
export const logoutUser = async (req, res) => {
  try {
    res.cookie("token", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Logout Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during logout.",
    });
  }
};

// -------------------------------
// GET USER PROFILE
// -------------------------------
export const getUserProfile = async (req, res) => {
  try {
    let user = await User.findById(req.user.id).select(
      "name email role profileImage phone"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Set defaults if missing
    if (!user.profileImage) {
      user.profileImage = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"; // default image URL
    }

    if (!user.phone) {
      user.phone = "N/A"; // default phone
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error getting user profile.",
    });
  }
};



// -------------------------------
// UPDATE USER PROFILE
// -------------------------------
export const updateUserProfile = async (req, res) => {
  try {
    // req.user.id is set by the authentication middleware
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const {
      name,
      phone,
      address,
      city,
      state,
      postalCode,
      shopName,
      businessType,
      gstNumber,
    } = req.body;

    // --- 1. Apply Updates to User Object ---
    // Only update if the field is explicitly provided in the request body (using 'undefined' check)
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (city !== undefined) user.city = city;
    if (state !== undefined) user.state = state;
    if (postalCode !== undefined) user.postalCode = postalCode;

    // --- Seller Specific Fields ---
    if (shopName !== undefined) user.shopName = shopName;
    if (businessType !== undefined) user.businessType = businessType;
    // CRITICAL FIX: Only update gstNumber if provided. Do NOT set a non-validating default like "N/A".
    if (gstNumber !== undefined) {
      user.gstNumber = gstNumber;
    }
    
    // --- 2. Dynamic Profile Completeness Check ---
    let profileIsComplete = true;

    // Check General Fields (Required for ALL roles)
    const requiredGeneralFields = [user.name, user.phone, user.address, user.city, user.state, user.postalCode];

    // Check if any general required field is missing (empty string, null, or undefined)
    // We trim to handle cases where a user might input only spaces.
    if (!requiredGeneralFields.every(field => field && String(field).trim() !== '')) {
        profileIsComplete = false;
    }

    // Check Seller Specific Fields (If role is seller)
    if (profileIsComplete && user.role === 'seller') {
        const requiredSellerFields = [user.shopName, user.businessType, user.gstNumber];
        
        // Ensure all seller fields are non-empty and non-default (if applicable)
        if (!requiredSellerFields.every(field => field && String(field).trim() !== '')) {
            profileIsComplete = false;
        }
        
        // Additional check: Ensure gstNumber is not set to the old invalid default if it somehow persisted
        if (user.gstNumber === 'N/A') {
            profileIsComplete = false;
        }
    }

    // Set the status
    user.isProfileComplete = profileIsComplete;
    
    // --- 3. Save User and Respond ---
    await user.save({ validateModifiedOnly: true });

    // --- 4. Prepare Response for Frontend ---
    // Return all relevant fields for both buyer and seller UIs
    const responseUser = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        city: user.city,
        state: user.state,
        postalCode: user.postalCode,
        profileImage: user.profileImage, // Include image fields
        shopName: user.shopName,
        businessType: user.businessType,
        gstNumber: user.gstNumber,
        isProfileComplete: user.isProfileComplete, // New status
        createdAt: user.createdAt,
    };

    res.status(200).json({
      success: true,
      message: "Profile updated successfully. Profile completion status updated.",
      user: responseUser,
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    
    // Send back a 400 for Mongoose validation errors
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({
            success: false,
            message: messages.join('; '),
        });
    }
    res.status(500).json({
      success: false,
      message: "Server error updating profile.",
    });
  }
};


// -------------------------------
// UPLOAD PROFILE IMAGE
// -------------------------------


export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // Upload to Cloudinary
    const { url, public_id } = await uploadToCloudinary(req.file.path, "profileImages");

    // Update user
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profileImage: url, profileImageId: public_id },
      { new: true }
    ).select("name email role profileImage phone");

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Profile Image Upload Error:", error);
    res.status(500).json({ success: false, message: "Profile image upload failed" });
  }
};





// -------------------------------
// FORGOT PASSWORD
// -------------------------------
export const forgotPassword = async (req, res) => {
  try {
    const email = req.body.email?.email || req.body.email;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email.",
      });
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${req.protocol}://${req.get(
      "host"
    )}/api/v1/users/reset-password/${resetToken}`;

    res.status(200).json({
      success: true,
      message: "Password reset token generated successfully.",
      resetUrl,
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during password reset request.",
    });
  }
};

// -------------------------------
// RESET PASSWORD
// -------------------------------
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and confirmation are required.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }
    console.log("token is ", req.params.token);

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token.",
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during password reset.",
    });
  }
};

// -------------------------------
// GET ALL USERS
// -------------------------------
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Get All Users Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching users.",
    });
  }
};

// -------------------------------
// DELETE USER
// -------------------------------
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    await user.remove();

    res.status(200).json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting user.",
    });
  }
};

// -------------------------------
// UPDATE USER ROLE
// -------------------------------
export const updateUserRole = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const { role } = req.body;
    user.role = role || user.role;
    await user.save();

    res.status(200).json({
      success: true,
      message: "User role updated successfully.",
      user,
    });
  } catch (error) {
    console.error("Update User Role Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating user role.",
    });
  }
};
