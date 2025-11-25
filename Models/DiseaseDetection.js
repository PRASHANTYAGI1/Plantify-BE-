import mongoose from "mongoose";

const diseaseDetectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    imageUrl: {
      type: String,
      required: [true, "Image URL is required"],
      match: [
        /^https?:\/\/.+/,
        "Please provide a valid Cloudinary or HTTP image URL",
      ],
    },
    detectedDisease: {
      type: String,
      required: [true, "Detected disease name is required"],
      trim: true,
    },
    confidence: {
      type: Number,
      required: true,
      min: [0, "Confidence cannot be less than 0"],
      max: [1, "Confidence must be between 0 and 1"],
    },
    recommendedRemedy: {
      type: String,
      trim: true,
      maxlength: [1000, "Remedy description too long"],
    },
    suggestedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  { timestamps: true }
);

diseaseDetectionSchema.index({ userId: 1, createdAt: -1 });

const DiseaseDetection = mongoose.model("DiseaseDetection", diseaseDetectionSchema);
export default DiseaseDetection;
