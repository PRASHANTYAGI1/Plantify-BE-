import Order from "../Models/OrderModel.js";
import Product from "../Models/ProductModel.js";
import User from "../Models/UserModel.js";
import Cart from "../Models/CartModel.js";

// this functionality for massage end on whatsap ok ====================================
import twilio from "twilio";

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

// ================================
// Helper: normalize phone number for WhatsApp
// ================================
const formatPhoneNumber = (number) => {
  if (!number) return null;
  let digits = number.replace(/\D/g, "");
  if (!digits.startsWith("91")) digits = "91" + digits; // assume India
  return `whatsapp:+${digits}`;
};

// ================================
// Helper: send WhatsApp message
// ================================
const sendWhatsAppMessage = async (to, message) => {
  try {
    if (!to || !message) return;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER.startsWith(
      "whatsapp:"
    )
      ? process.env.TWILIO_WHATSAPP_NUMBER
      : `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
    await client.messages.create({
      from: fromNumber,
      to,
      body: message,
    });
    console.log("WhatsApp sent to", to);
  } catch (error) {
    console.error("WhatsApp Error:", error.message);
  }
};

/**
 * 🛒 Place Order Controller
 * - Deducts stock
 * - Notifies seller & buyer via WhatsApp
 * - Alerts seller when product stock = 0
 */
// ==================================================================================
// -----------------------------
// 🛒 1️⃣ Place a new order (buyer only)
// -----------------------------

// import Product from "../Models/ProductModel.js";
// import Order from "../Models/OrderModel.js";
// import User from "../Models/UserModel.js";
// import { sendWhatsAppMessage } from "../Utils/notificationService.js";

export const placeOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, totalAmount } = req.body;
    const userId = req.user.id;

    if (!items || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No items provided." });
    }

    const buyer = await User.findById(userId);
    if (!buyer)
      return res
        .status(404)
        .json({ success: false, message: "Buyer not found." });

    let orderItems = [];
    let calculatedTotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId).populate(
        "sellerId",
        "name phone"
      );
      if (!product)
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productId}`,
        });

      // Prevent duplicate active orders
      const existingOrder = await Order.findOne({
        userId,
        "items.productId": product._id,
        orderStatus: { $in: ["processing", "pending"] },
      });

      if (existingOrder) {
        return res.status(400).json({
          success: false,
          message: `You already have an active order for "${product.name}".`,
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`,
        });
      }

      product.stock -= item.quantity;
      await product.save();

      orderItems.push({
        productId: product._id,
        quantity: item.quantity,
        priceAtTime: product.price,
        sellerId: product.sellerId?._id || null,
      });

      calculatedTotal += product.price * item.quantity;

      // Notify seller if stock is zero
      if (product.stock === 0 && product.sellerId?.phone) {
        const sellerMsg = `⚠️ Hello ${product.sellerId.name}, your product "${product.name}" is OUT OF STOCK! Please restock.`;
        await sendWhatsAppMessage(
          formatPhoneNumber(product.sellerId.phone),
          sellerMsg
        );
      }
    }

    const finalTotal = totalAmount || calculatedTotal;

    const newOrder = new Order({
      userId,
      items: orderItems,
      totalAmount: finalTotal,
      shippingAddress,
      paymentMethod,
      paymentStatus: paymentMethod === "Online" ? "completed" : "pending",
      orderStatus: "processing",
    });

    await newOrder.save();

    // Send WhatsApp notifications to sellers & buyer
    for (const item of orderItems) {
      const product = await Product.findById(item.productId).populate(
        "sellerId",
        "name phone"
      );

      // Seller notification
      if (product.sellerId?.phone) {
        const sellerMsg = `
🌿 New Order Received! 🌿
Buyer: ${buyer.name} (${buyer.phone || "N/A"})
Product: ${product.name}
Quantity: ${item.quantity}
Total: ₹${product.price * item.quantity}
Updated Stock: ${product.stock}`;
        await sendWhatsAppMessage(
          formatPhoneNumber(product.sellerId.phone),
          sellerMsg
        );
      }

      // Buyer notification
      if (buyer.phone) {
        const buyerMsg = `
🛒 Order Placed Successfully!
Product: ${product.name}
Seller: ${product.sellerId?.name || "N/A"} (${product.sellerId?.phone || "N/A"})
Amount: ₹${product.price * item.quantity}
Shipping: ${shippingAddress}
Status: Processing`;
        await sendWhatsAppMessage(formatPhoneNumber(buyer.phone), buyerMsg);
      }
    }

    return res.status(201).json({
      success: true,
      message:
        "Order placed successfully. Notifications sent to buyer and seller.",
      order: newOrder,
    });
  } catch (error) {
    console.error("❌ Place Order Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while placing order",
      error: error.message,
    });
  }
};

// 📦 2️⃣ Get all orders of logged-in buyer
export const getBuyerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .populate("items.productId", "name price images")
      .sort({ createdAt: -1 }); // optional: latest first

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("❌ Get Buyer Orders Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching buyer orders",
      error: error.message,
    });
  }
};

// -----------------------------
// 🧾 3️⃣ Get all orders that include seller’s products
// -----------------------------
export const getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const orders = await Order.find({ "items.sellerId": sellerId })
      .populate("items.productId", "name price images")
      .populate("userId", "name email");

    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error("Get Seller Orders Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching seller orders",
      error: error.message,
    });
  }
};

// -----------------------------
// 🔄 4️⃣ Update order item status (seller only)
// -----------------------------
export const updateOrderItemStatus = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    const order = await Order.findById(orderId)
      .populate("userId", "name phone")
      .populate("items.productId", "name sellerId")
      .populate("items.sellerId", "name phone");

    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    const item = order.items.find((i) => i._id.toString() === itemId);
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Order item not found" });

    const isSeller = item.sellerId?._id.toString() === userId;
    const isBuyer = order.userId._id.toString() === userId;
    if (!isSeller && !isBuyer)
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });

    // Update item status
    item.itemStatus = status;

    // Restore stock if cancelled
    if (status === "cancelled") {
      const product = await Product.findById(item.productId);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }

    // Update overall order status if all delivered
    if (status === "delivered") {
      const allDelivered = order.items.every(
        (i) => i.itemStatus === "delivered"
      );
      if (allDelivered) order.orderStatus = "completed";
    }

    await order.save();

    const buyer = order.userId;
    const seller = item.sellerId;

    // Notifications
    if (buyer.phone) {
      const msg = `
📦 Order Update 📦
Product: ${item.productId.name}
Seller: ${seller?.name || "N/A"}
Status: ${status.toUpperCase()}`;
      await sendWhatsAppMessage(formatPhoneNumber(buyer.phone), msg);
    }

    if (status === "cancelled" && seller?.phone) {
      const msg = `
❌ Order Cancelled by Buyer ❌
Buyer: ${buyer.name}
Product: ${item.productId.name}
Quantity: ${item.quantity}
Updated Stock: ${item.productId.stock + item.quantity}`;
      await sendWhatsAppMessage(formatPhoneNumber(seller.phone), msg);
    }

    return res
      .status(200)
      .json({ success: true, message: "Order item status updated", order });
  } catch (error) {
    console.error("❌ Update Order Item Status Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// -----------------------------
// 📋 5️⃣ Get a specific order (buyer or seller)
// -----------------------------
export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("items.productId", "name price images")
      .populate("items.sellerId", "name email")
      .populate("userId", "name email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Authorization: Buyer can see own orders, seller can see orders that contain their products, admin can see all
    if (
      (req.user.role === "buyer" &&
        order.userId._id.toString() !== req.user.id) ||
      (req.user.role === "seller" &&
        !order.items.some(
          (item) => item.sellerId._id.toString() === req.user.id
        ))
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this order",
      });
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get Order By ID Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching order",
      error: error.message,
    });
  }
};

// -----------------------------
// 🧮 6️⃣ Get all orders (admin only)
// -----------------------------
export const getAllOrdersAdmin = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("items.productId", "name price images")
      .populate("items.sellerId", "name email")
      .populate("userId", "name email");

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Get All Orders Admin Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching all orders",
      error: error.message,
    });
  }
};

// ================================
// 🗑 Delete Order (Buyer)
// ================================
export const deleteOrderByBuyer = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: User not found" });

    const { orderId } = req.params;
    const order = await Order.findById(orderId).populate("items.productId");
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });

    if (order.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    if (["completed", "shipped"].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete completed or shipped orders.",
      });
    }

    // Restore stock & notify sellers
    for (const item of order.items) {
      const productId = item.productId?._id || item.productId;
      const product = await Product.findById(productId).populate(
        "sellerId",
        "name phone"
      );
      if (!product) continue;

      product.stock += item.quantity;
      await product.save();

      if (product.sellerId?.phone) {
        const msg = `⚠️ Order Canceled ⚠️
Buyer ${req.user.name} canceled their order for "${product.name}".
Restocked Quantity: ${item.quantity}
Updated Stock: ${product.stock}`;
        await sendWhatsAppMessage(
          formatPhoneNumber(product.sellerId.phone),
          msg
        );
      }
    }

    await Order.findByIdAndDelete(orderId);

    return res.status(200).json({
      success: true,
      message:
        "Order deleted successfully, stock restored, and seller notified.",
    });
  } catch (error) {
    console.error("❌ Delete Order Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting order",
      error: error.message,
    });
  }
};
