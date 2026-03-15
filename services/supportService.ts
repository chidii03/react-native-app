// services/supportService.ts

import { functions } from "./appwriteConfig"; // re-uses your existing Appwrite client

const FUNCTION_ID =
  process.env.EXPO_PUBLIC_APPWRITE_SUPPORT_FUNCTION_ID ?? "69b688f20036184f0e7f";

export interface SupportPayload {
  name:    string;
  email:   string;
  message: string;
}

export const sendSupportEmail = async (payload: SupportPayload): Promise<void> => {
  const { name, email, message } = payload;

  if (!name.trim() || !email.trim() || !message.trim()) {
    throw new Error("Please fill in all fields.");
  }

  if (!FUNCTION_ID) {
    throw new Error(
      "Support function not configured. Add EXPO_PUBLIC_APPWRITE_SUPPORT_FUNCTION_ID to your environment variables."
    );
  }

  // Call the Appwrite function
  const execution = await functions.createExecution(
    FUNCTION_ID,
    JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
    false, // sync execution — waits for result
  );

  // Check function response
  const statusCode = execution.responseStatusCode ?? 200;
  if (statusCode >= 400) {
    let errMsg = "Failed to send message. Please try again.";
    try {
      const body = JSON.parse(execution.responseBody ?? "{}");
      errMsg = body?.error ?? errMsg;
    } catch {}
    throw new Error(errMsg);
  }
};