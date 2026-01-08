import express from "express";
import axios from "axios";
import crypto from "crypto";
import LinkedInToken from "../models/linkedinToken.model.js";

const router = express.Router();

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

// ------------------- LOGIN -------------------
router.get("/login", (req, res) => {
  const state = crypto.randomUUID();
  req.session.linkedinState = state;

  const scope = [
    "openid",
    "profile",
    "email",
    "w_member_social"
  ].join(" ");

  const authUrl =
    "https://www.linkedin.com/oauth/v2/authorization" +
    `?response_type=code` +
    `&client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${state}`;
  res.redirect(authUrl);
});

// ------------------- CALLBACK -------------------
router.get("/callback", async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return sendPopupResponse(res, "failed", "Authorization code missing");
  }

  if (!state || state !== req.session.linkedinState) {
    return sendPopupResponse(res, "failed", "Invalid OAuth State");
  }

  try {
    const data = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    });

    const tokenRes = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      data.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenRes.data.access_token;
    const expiresIn = tokenRes.data.expires_in;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Get Member URN
    const meRes = await axios.get(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "LinkedIn-Version": "20240101"
        }
      }
    );

    const memberUrn = `urn:li:person:${meRes.data.sub}`;

    await LinkedInToken.findOneAndUpdate(
      { _id: "linkedin_app_token" },
      {
        _id: "linkedin_app_token",
        accessToken,
        expiresAt,
        memberUrn
      },
      { upsert: true, new: true }
    );

    delete req.session.linkedinState;

    return sendPopupResponse(res, "success");
  } catch (err) {
    console.error("LinkedIn OAuth Error:", err?.response?.data || err.message);
    return sendPopupResponse(res, "failed", "Token exchange failed");
  }
});


// ------------------- STATUS -------------------
router.get("/status", async (req, res) => {
  const tokenDoc = await LinkedInToken.findById("linkedin_app_token");

  if (!tokenDoc) return res.json({ connected: false });

  const expired = new Date() > tokenDoc.expiresAt;

  res.json({
    connected: !expired,
    expired,
    expiresAt: tokenDoc.expiresAt
  });
});

// ------------------- Helper Popup Sender -------------------
function sendPopupResponse(res, status, message) {
  return res.send(`
    <html>
      <body>
        <script>
          window.opener?.postMessage(
            { status: "${status}", source: "linkedin-auth", message: "${message || ""}" },
            "${FRONTEND_ORIGIN}"
          );
          window.close();
        </script>
        <p>You can close this window</p>
      </body>
    </html>
  `);
}

export default router;
