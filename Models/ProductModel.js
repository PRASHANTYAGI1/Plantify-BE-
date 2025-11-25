import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      default: [],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, "Comment cannot exceed 500 characters"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Seller ID is required"],
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [2, "Product name must be at least 2 characters"],
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters long"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ["fertilizer", "seed", "plant", "tool", "accessory"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
      validate: {
        validator: (v) => /^\d+(\.\d{1,2})?$/.test(v),
        message: "Price can have up to two decimal places",
      },
    },
    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Stock must be an integer value",
      },
    },
    images: [
      {
        type: String,
        required: true, // at least one image URL is expected
        default: [],
        match: [
          /^https?:\/\/.+/,
          "Please provide valid Cloudinary or HTTP image URLs",
        ],
      },
      
    ],
    ratings: [ratingSchema],
  },
  { timestamps: true }
);


// In productModel.js

// Compound index: seller + product name must be unique
productSchema.index({ sellerId: 1, name: 1, category: 1 }, { unique: true });


// 🧮 Virtual: Calculate average rating
productSchema.virtual("averageRating").get(function () {
  const ratings = Array.isArray(this.ratings) ? this.ratings : [];
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, item) => acc + item.rating, 0);
  return parseFloat((sum / ratings.length).toFixed(1));
});




// 💾 Index for faster seller-based queries
productSchema.index({ sellerId: 1, category: 1 });

// 🧹 Ensure virtuals are included in JSON responses
productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

const Product = mongoose.model("Product", productSchema);
export default Product;
