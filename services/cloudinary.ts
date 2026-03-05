import { Platform } from "react-native";

type UploadResult = {
  secureUrl: string;
};

const CLOUDINARY_CLOUD_NAME = String(process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "").trim();
const CLOUDINARY_UPLOAD_PRESET = String(process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "").trim();

const ensureCloudinaryConfig = () => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env");
  }
};

export const uploadAvatarToCloudinary = async (uri: string): Promise<UploadResult> => {
  ensureCloudinaryConfig();

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const formData = new FormData();
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "movietime/avatars");

  if (Platform.OS === "web") {
    const fileBlob = await fetch(uri).then((r) => r.blob());
    formData.append("file", fileBlob, `avatar-${Date.now()}.jpg`);
  } else {
    formData.append("file", {
      uri,
      type: "image/jpeg",
      name: `avatar-${Date.now()}.jpg`,
    } as any);
  }

  const res = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });
  const json = await res.json();

  if (!res.ok || !json?.secure_url) {
    throw new Error(json?.error?.message ?? "Unable to upload avatar image");
  }

  return { secureUrl: String(json.secure_url) };
};
