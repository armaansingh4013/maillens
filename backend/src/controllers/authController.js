import { oauth2Client } from "../config/google.js";
import { google } from "googleapis";
import prisma from "../db/prisma.js";

const frontendUrl =
  process.env.FRONTEND_URL ||
  process.env.CLIENT_URL ||
  "http://localhost:5173";

function buildFrontendRedirect(path, params) {
  const url = new URL(path, frontendUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

function encodeAuthPayload(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export const googleLogin = async (req, res) => {
  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });

  res.redirect(url);
};

export const googleCallback = async (req, res) => {
  try {
    const code = req.query.code;

    if (!code) {
      return res.status(400).json({ ok: false, error: "No code received from Google" });
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: "v2",
    });

    const { data } = await oauth2.userinfo.get();

    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {
        name: data.name,
        googleId: data.id,
      },
      create: {
        email: data.email,
        name: data.name,
        googleId: data.id,
      },
    });

    const existingToken = await prisma.oauthToken.findFirst({
      where: {
        userId: user.id,
        provider: "google",
      },
    });

    if (existingToken) {
      await prisma.oauthToken.update({
        where: { id: existingToken.id },
        data: {
          accessToken: tokens.access_token || existingToken.accessToken,
          refreshToken: tokens.refresh_token || existingToken.refreshToken,
          expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : existingToken.expiryDate,
          scope: tokens.scope || existingToken.scope,
        },
      });
    } else {
      await prisma.oauthToken.create({
        data: {
          userId: user.id,
          provider: "google",
          accessToken: tokens.access_token || null,
          refreshToken: tokens.refresh_token || null,
          expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          scope: tokens.scope || null,
        },
      });
    }

    const authPayload = encodeAuthPayload({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });

    return res.redirect(
      buildFrontendRedirect("/dashboard", {
        auth: authPayload,
      })
    );
  } catch (error) {
    console.error("Google callback error:", error);

    return res.redirect(
      buildFrontendRedirect("/", {
        authError:
          error.message ||
          "Google OAuth failed. Please try again.",
      })
    );
  }
};
