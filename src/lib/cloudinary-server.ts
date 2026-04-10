import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Ek hi function — students aur employees dono ke liye
export const uploadImage = async (
  base64String: string,
  folder: "students" | "employees" | "users",
  schoolName: string,
) => {
  try {
    const res = await cloudinary.uploader.upload(base64String, {
      folder: `school_management/${schoolName}/${folder}`,
      resource_type: "image",
      transformation: [{ quality: "auto", fetch_format: "webp" }],
      tags: ["pending"], // ✅ har upload pe pending tag
    });
    return res.secure_url;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw new Error("Failed to upload image to cloud");
  }
};

// ✅ Ek hi delete function — students aur employees dono ke liye
export const deleteImage = async (imageUrl: string) => {
  const parts = imageUrl.split("/upload/");
  const withVersion = parts[1];
  const withoutVersion = withVersion.replace(/^v\d+\//, "");
  const publicId = withoutVersion.replace(/\.[^/.]+$/, "");
  await cloudinary.uploader.destroy(publicId);
};

export default cloudinary;
