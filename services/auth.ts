import * as Linking from "expo-linking";
import { ID, OAuthProvider } from "react-native-appwrite";
import { account } from "./appwriteConfig";

const recoveryRedirect =
  process.env.EXPO_PUBLIC_APPWRITE_RECOVERY_URL ?? Linking.createURL("/reset-password");

export const signUp = async (email: string, password: string, name: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await account.create(ID.unique(), normalizedEmail, password, name.trim());
  await account.createEmailPasswordSession(normalizedEmail, password);
  return user;
};

export const signIn = async (email: string, password: string) => {
  return account.createEmailPasswordSession(email.trim().toLowerCase(), password);
};

export const signOut = async () => {
  return account.deleteSession("current");
};

export const getCurrentUser = async () => {
  try {
    return await account.get();
  } catch {
    return null;
  }
};

export const updateName = async (name: string) => {
  return account.updateName(name.trim());
};

export const updatePassword = async (newPassword: string, oldPassword: string) => {
  return account.updatePassword(newPassword, oldPassword);
};

export const sendPasswordRecovery = async (email: string) => {
  return account.createRecovery(email.trim().toLowerCase(), recoveryRedirect);
};

export const startOAuth = async (provider: OAuthProvider.Google | OAuthProvider.Facebook) => {
  return account.createOAuth2Session(provider);
};

