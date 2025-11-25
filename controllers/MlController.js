import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import path from 'path';

// IMPORTANT: Define the URL for your running FastAPI service
const FASTAPI_URL = 'http://localhost:8000/predict'; 

/**
 * Handles image upload and forwards the file to the FastAPI model endpoint
 * via an HTTP POST request.
 * * Assumes the image file details are available in req.file (from uploadMiddleware).
 */
export const runMLModel = async (req, res) => {
    // 1. Validate File and Path
    if (!req.file || !req.file.path) {
        return res.status(400).json({ success: false, message: "No image file provided in the request body." });
    }

    const imageFilePath = req.file.path;
    
    try {
        // 2. Prepare Form Data for FastAPI
        const form = new FormData();
        
        // Read the file stream and append it to the form data
        // The field name 'file' must match the 'file: UploadFile = File(...)' in app.py
        form.append('file', fs.createReadStream(imageFilePath), path.basename(imageFilePath));
        
        // You can also append the threshold if needed:
        // form.append('threshold', req.body.threshold || 0.7);

        // 3. Make HTTP POST Request to FastAPI
        const response = await axios.post(FASTAPI_URL, form, {
            headers: {
                ...form.getHeaders(),
                // Add any necessary headers
            },
            maxBodyLength: Infinity, // Important for large uploads
        });

        // 4. Handle Successful Response from FastAPI
        // FastAPI returns the prediction and confidence data directly
        const mlResult = response.data;
        
        // Delete the temporary file created by the upload middleware
        try { fs.unlinkSync(imageFilePath); } catch (e) { console.error("Could not delete temp file:", e); }

        // FIX: Merge the mlResult object into the main response body
        // This flattens the response, placing prediction_class and confidence_percent at the root.
        return res.status(200).json({ 
            success: true, 
            message: "Prediction received successfully.", 
            ...mlResult // Spreads the predicted_class, confidence_percent, etc., into the response
        });

    } catch (error) {
        // Ensure the temporary file is deleted even on error
        try { fs.unlinkSync(imageFilePath); } catch (e) { /* silent fail */ }

        let errorMessage = "An unknown error occurred during ML processing.";
        let statusCode = 500;

        if (axios.isAxiosError(error) && error.response) {
            // Error returned from the FastAPI service (e.g., 400 or 500 from FastAPI)
            errorMessage = error.response.data.error || "FastAPI returned an error.";
            statusCode = error.response.status;
            console.error("FastAPI Error Response:", errorMessage);
        } else if (axios.isAxiosError(error)) {
             // Network or timeout error connecting to FastAPI
            errorMessage = `Could not connect to the ML service at ${FASTAPI_URL}. Is the Uvicorn server running?`;
            statusCode = 503;
            console.error("Axios Network Error:", error.message);
        } else {
            // Local processing error (e.g., file system access)
            console.error("Local Error:", error);
            errorMessage = error.message;
        }

        return res.status(statusCode).json({ success: false, message: errorMessage });
    }
};
// ```
// eof

// With this change, your API response will look something like this on success:

// ```json
// {
//     "success": true, 
//     "message": "Prediction received successfully.", 
//     "predicted_class": "Potato___Early_blight",
//     "confidence_percent": 98.75,
//     "raw_probabilities": {
//         "Potato___Early_blight": 98.75,
//         "Potato___Late_blight": 1.15,
//         "Potato___healthy": 0.1
//     }
// }
