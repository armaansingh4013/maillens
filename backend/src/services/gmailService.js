import { google } from "googleapis";
import prisma from "../db/prisma.js";
import dotenv from "dotenv";

dotenv.config();

export const getGmailClient = async (userId) => {
  const token = await prisma.oauthToken.findFirst({
    where: {
      userId,
      provider: "google",
    },
  });

  if (!token) {
    throw new Error("No token found for user");
  }

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  auth.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    expiry_date: token.expiryDate
      ? new Date(token.expiryDate).getTime()
      : undefined,
  });

  // 🔥 IMPORTANT: listen for token refresh
  auth.on("tokens", async (newTokens) => {
    console.log("🔄 Tokens refreshed");

    try {
      await prisma.oauthToken.update({
        where: { id: token.id },
        data: {
          accessToken: newTokens.access_token || token.accessToken,
          refreshToken: newTokens.refresh_token || token.refreshToken,
          expiryDate: newTokens.expiry_date
            ? new Date(newTokens.expiry_date)
            : token.expiryDate,
        },
      });
    } catch (err) {
      console.error("Failed to save refreshed token:", err.message);
    }
  });

  return google.gmail({ version: "v1", auth });
};