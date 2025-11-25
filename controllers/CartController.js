import Cart from "../Models/CartModel.js";
import Product from "../Models/ProductModel.js";

// -------------------------------
// 🛒 Add product to cart
// -------------------------------
export const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.id;

    if (!productId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Product ID and quantity are required",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if user already has a cart
    let cart = await Cart.findOne({ userId });

    const cartItem = {
      productId: product._id,
      sellerId: product.sellerId,
      quantity,
      priceAtTime: product.price,
    };

    if (cart) {
      // Check if product already exists in cart
      const existingItemIndex = cart.items.findIndex(
        (item) => item.productId.toString() === productId
      );

      if (existingItemIndex > -1) {
        // Update quantity instead of adding duplicate
        cart.items[existingItemIndex].quantity += quantity;
      } else {
        cart.items.push(cartItem);
      }

      await cart.save();
    } else {
      // Create new cart for user
      cart = await Cart.create({
        userId,
        items: [cartItem],
      });
    }

    res.status(200).json({
      success: true,
      message: "Product added to cart successfully",
      cart,
    });
  } catch (error) {
    console.error("Add to Cart Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error adding product to cart",
      error: error.message,
    });
  }
};

// -------------------------------
// 🗑️ Remove product from cart
// -------------------------------
export const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    const updatedItems = cart.items.filter(
      (item) => item.productId.toString() !== productId
    );

    cart.items = updatedItems;
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Product removed from cart",
      cart,
    });
  } catch (error) {
    console.error("Remove from Cart Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error removing product from cart",
      error: error.message,
    });
  }
};

// -------------------------------
// ✏️ Update cart item quantity
// -------------------------------
export const updateCartItemQuantity = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    const item = cart.items.find((item) => item.productId.toString() === productId);
    if (!item) {
      return res.status(404).json({ success: false, message: "Product not in cart" });
    }

    item.quantity = quantity;
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart item quantity updated",
      cart,
    });
  } catch (error) {
    console.error("Update Cart Item Quantity Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating cart item",
      error: error.message,
    });
  }
};

// -------------------------------
// 🛍️ Get user's cart
// -------------------------------
export const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user.id }).populate(
      "items.productId",
      "name price images"
    );

    if (!cart) {
      // Create empty cart for user if not exists
      cart = await Cart.create({ userId: req.user.id, items: [] });
    }

    res.status(200).json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error("Get Cart Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching cart",
      error: error.message,
    });
  }
};

