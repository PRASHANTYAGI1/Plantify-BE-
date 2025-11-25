import { spawn } from "child_process";
import { uploadToCloudinary } from "../middleware/uploader.js";
import cloudinary from "../config/cloudnary.js";
import path from "path";

// 🌿 Dynamically choose ML model based on plant type
const getModelScript = (plantType) => {
  switch (plantType.toLowerCase()) {
    case "tomato":
      return "ml/tomatoModel.py";
    case "potato":
      return "ml/potatoModel.py";
    case "wheat":
      return "ml/wheatModel.py";
    default:
      return "ml/unsupervisedClusterModel.py";
  }
};

export const detectDisease = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No image uploaded" });

    const { plantType } = req.body;
    if (!plantType) return res.status(400).json({ success: false, message: "Plant type required" });

    // 1️⃣ Upload image to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.path, "plant_disease_uploads");

    // 2️⃣ Choose ML model
    const modelPath = getModelScript(plantType);

    // 3️⃣ Spawn Python process to run prediction
    const python = spawn("python", [modelPath, uploadResult.url]);

    let predictionData = "";
    python.stdout.on("data", (data) => (predictionData += data.toString()));
    python.stderr.on("data", (data) => console.error("Python Error:", data.toString()));

    python.on("close", async (code) => {
      try {
        if (code !== 0) throw new Error("Python model failed");

        const prediction = JSON.parse(predictionData.trim());

        // 4️⃣ Delete Cloudinary image after prediction to keep light
        await cloudinary.uploader.destroy(uploadResult.public_id);

        // 5️⃣ Send response
        res.status(200).json({
          success: true,
          message: "Prediction successful",
          prediction,
        });
      } catch (error) {
        console.error("Prediction handling error:", error);
        res.status(500).json({ success: false, message: "Error processing prediction" });
      }
    });
  } catch (error) {
    console.error("Disease Detection Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
