import LinkedInToken from "../models/linkedinToken.model.js";

import express from "express";
import axios from "axios";

const router = express.Router();

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;

router.get("/login", (req, res) => {
  const scope = "w_member_social";

  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=${scope}`;

  return res.redirect(url);
});

//LinkedIn Callback → Exchange Code → Token
router.get("/callback", async (req, res) => {
  const code = req.query.code;

  if (!code)
    return res.status(400).json({ message: "Authorization code missing" });

  try {
    const tokenRes = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      null,
      {
        params: {
          grant_type: "authorization_code",
          code,
          redirect_uri: REDIRECT_URI,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
        },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const accessToken = tokenRes.data.access_token;
    const expiresIn = tokenRes.data.expires_in;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await LinkedInToken.findOneAndUpdate(
      {},
      { accessToken, expiresAt },
      { upsert: true, new: true }
    );

    return res.send(`
    <html>
      <body>
        <script>
          window.opener.postMessage(
            { status: "success", source: "linkedin-auth" },
            "http://localhost:5173"
          );
          window.close();
        </script>
        <p>You can close this window</p>
      </body>
    </html>
`);
  } catch (err) {
    console.error("LinkedIn OAuth Error:", err.response?.data || err.message);
    return res.send(`
    <html>
      <body>
        <script>
          window.opener.postMessage(
            { status: "failed", source: "linkedin-auth" },
            "*"
          );
          window.close();
        </script>
        <p>LinkedIn connection failed. You can close this window.</p>
      </body>
    </html>
  `);
  }
});

router.get("/status", async (req, res) => {
  const tokenDoc = await LinkedInToken.findOne();

  if (!tokenDoc) return res.json({ connected: false });

  const expired = new Date() > tokenDoc.expiresAt;

  res.json({
    connected: !expired,
    expired,
    expiresAt: tokenDoc.expiresAt,
  });
});

export default router;