import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    priceAtTime: { type: Number, required: true },
    itemStatus: {
      type: String,
      enum: ["pending", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    canReorder: { type: Boolean, default: false }, // ✅ Explicit flag to allow reorder
  },
  { _id: true } // keep unique _id for each item
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    shippingAddress: { type: String, required: true },
    paymentMethod: { type: String, enum: ["COD", "Online"], default: "COD" },
    paymentStatus: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
    orderStatus: { type: String, enum: ["processing", "completed", "cancelled"], default: "processing" },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);


// canReorder for each item – if the seller cancels, we mark it true so the frontend can show "Reorder" button.

// Separate orderItemSchema – keeps item-level data clean and easier to extend.

// Keeps _id for each item – needed for updating status individually.