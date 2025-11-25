// controllers/ProductController.js
import Product from "../Models/ProductModel.js"
import { uploadToCloudinary } from "../Middleware/uploadMiddleware.js";

// ===========================
// 1️⃣ Create Product (Seller Only)
// ===========================
export const createProduct = async (req, res) => {
  try {
    const { name, description, category, price, stock } = req.body;
    const sellerId = req.user.id;

    // ✅ Prevent duplicate product for same seller
    const existingProduct = await Product.findOne({ sellerId, name, category });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "You already have a product with the same name and category.",
      });
    }

    const imageUrls = [];

    if (req.files && req.files.length > 0) {
      // Upload images to Cloudinary
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.path, "products");
        imageUrls.push(result.url);
      }
    }

    // Default image if none uploaded
    if (imageUrls.length === 0) {
      imageUrls.push(
        "https://www.shutterstock.com/image-vector/no-item-found-vector-outline-260nw-2082716986.jpg"
      );
    }

    // Create product
    const newProduct = new Product({
      sellerId,
      name,
      description,
      category,
      price: Number(price),
      stock: Number(stock),
      images: imageUrls,
    });

    const savedProduct = await newProduct.save();

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: savedProduct,
    });
  } catch (error) {
    console.error("Create Product Error:", error);

    // Handle unique index error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate product detected for this seller.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error creating product",
    });
  }
};


// ===========================
// 2️⃣ Get Product By ID (Buyer & Seller)
// ===========================
export const getProductById = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId)
      .populate("sellerId", "name email");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      product: {
        ...product.toObject(),
        averageRating: product.averageRating,
      },
    });
  } catch (error) {
    console.error("Get Product By ID Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching product",
      error: error.message,
    });
  }
};

// ===========================
// get seller products 
// ==========================
export const getSellerProducts = async (req, res) => {
  try {
    // req.user is set by your isAuthenticated middleware
    const sellerId = req.user._id;

    const products = await Product.find({ sellerId });

    if (!products || products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No products found for this seller",
      });
    }

    res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("Error fetching seller products:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ===========================
// 3️⃣ Update Product (Seller Only)
// ===========================
export const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const updates = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (req.user._id.toString() !== product.sellerId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to update this product" });
    }

    const allowedFields = ["name", "description", "category", "price", "stock"];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) product[field] = updates[field];
    });

    // Handle new image uploads if provided
    if (req.files && req.files.length > 0) {
      const imageUrls = [];
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.path, "products");
        imageUrls.push(result.url);
      }
      product.images = imageUrls; // replace old images
    }

    const updatedProduct = await product.save();

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Update Product Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating product",
      error: error.message,
    });
  }
};

// --------------------------
// deleteProduct (by seller only)
// --------------------------
export const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Check if current user is the seller
    if (req.user._id.toString() !== product.sellerId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this product" });
    }

    // Use deleteOne instead of remove
    await product.deleteOne();

    res.status(200).json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete Product Error:", error);
    res.status(500).json({ success: false, message: "Server error deleting product" });
  }
};


// ===========================
// 5️⃣ Get All Products (Buyer & Seller)
// ===========================
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().populate("sellerId", "name email");
    res.status(200).json({ success: true, products });
  } catch (error) {
    console.error("Get All Products Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching products",
      error: error.message,
    });
  }
};

// ===========================
// 6️⃣ Get All Products (Admin Only)
// ===========================
export const getAllProductsAdmin = async (req, res) => {
  try {
    const products = await Product.find().populate("sellerId", "name email");
    res.status(200).json({ success: true, products });
  } catch (error) {
    console.error("Get All Products Admin Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching products for admin",
      error: error.message,
    });
  }
};
