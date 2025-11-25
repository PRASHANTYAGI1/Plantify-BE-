import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter your name"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
    },
    email: {
      type: String,
      required: [true, "Please enter your email address"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Please enter a password"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false, // hide password by default
    },
    role: {
      type: String,
      enum: ["buyer", "seller", "admin"],
      default: "buyer",
    },
    address: String,
    phone: {
      type: String,
      match: [/^[6-9]\d{9}$/, "Please enter a valid 10-digit phone number"],
    },
    city: String,
    state: String,
    postalCode: {
      type: String,
      match: [/^\d{5,6}$/, "Please enter a valid postal code"],
    },
    profileImage: String, // Cloudinary URL
    profileImageId: String, // Cloudinary public_id
    shopName: String,
    businessType: {
      enum: ["individual", "partnership", "company", "other"],
      type: String,
      default: "other",
    },
    gstNumber: {
      type: String,
      validate: {
        validator: function (v) {
          if (!v) return true; // ✅ allow empty
          return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
            v
          );
        },
        message: "Invalid GST number",
      },
    },

    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  }
);

// 🔒 Encrypt password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 🧩 Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 🔐 Generate and hash password reset token
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set token expiration (e.g., 1 minutes)
  this.resetPasswordExpire = Date.now() + 1 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);
export default User;
