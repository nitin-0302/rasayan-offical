import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

// Configure Cloudinary Credentials securely using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "demo",
  api_key: process.env.CLOUDINARY_API_KEY || "key",
  api_secret: process.env.CLOUDINARY_API_SECRET || "secret",
});

// Configure Multer Storage Engine to pipe file streams straight to Cloudinary bypass memory write
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Dynamically assign asset directories and transformations based on mime type
    const isVideo = file.mimetype.startsWith("video/");
    return {
      folder: "rasagram_uploads",
      resource_type: isVideo ? "video" : "image",
      allowed_formats: ["jpg", "jpeg", "png", "gif", "mp4", "mov", "webm"],
      transformation: isVideo
        ? [
            { width: 720, crop: "limit" }, // Streamline video resolution for standard web grids
            { quality: "auto" }
          ]
        : [
            { width: 1080, height: 1080, crop: "fill", gravity: "auto" }, // Square crops for primary feeds
            { quality: "auto:good" }
          ],
    };
  },
});

// Implement limits to guard against buffer memory leaks and payload spikes
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // Allow up to 15MB uploads (images and micro videos)
  },
  fileFilter: (req, file, cb) => {
    const isAccepted = 
      file.mimetype.startsWith("image/") || 
      file.mimetype.startsWith("video/");
    
    if (isAccepted) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type! Please upload an image or video path."));
    }
  },
});
