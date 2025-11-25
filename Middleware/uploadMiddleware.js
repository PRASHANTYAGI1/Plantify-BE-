import multer from "multer";
import fs from "fs";
import path from "path";
import cloudinary from "../config/cloudnary.js";

// -------------------------
// Temporary folder setup
// -------------------------
const tempDir = path.join(process.cwd(), "temp");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// -------------------------
// Multer storage configuration
// -------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// -------------------------
// File type filter (images only)
// -------------------------
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Only image files allowed"));
};

// -------------------------
// Multer upload instance
// -------------------------
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

// -------------------------
// Upload to Cloudinary
// -------------------------
export const uploadToCloudinary = async (localFilePath, folder = "uploads") => {
  try {
    // Upload from local temp folder to Cloudinary
    const result = await cloudinary.uploader.upload(localFilePath, {
      folder,
      resource_type: "image",
    });

    // Delete temp file after successful upload
    fs.unlink(localFilePath, (err) => {
      if (err) console.error("Error deleting temp file:", err);
    });

    // Return Cloudinary URL and public ID
    return { url: result.secure_url, public_id: result.public_id };
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);

    // Delete temp file even if upload failed
    if (fs.existsSync(localFilePath)) {
      try {
        fs.unlinkSync(localFilePath);
      } catch (err) {
        console.error("Error deleting temp file after failure:", err);
      }
    }

    throw new Error("Image upload failed");
  }
};

export default upload;
