import express from "express";
import axios from "axios";
import crypto from "crypto";
import LinkedInToken from "../models/linkedinToken.model.js";
import LinkedInOAuthTransaction from "../models/linkedinOAuthTransaction.model.js";

const router = express.Router();

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const OAUTH_CONFIGURED = !!(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI);

// console.info("[LinkedIn OAuth] Configuration loaded", {
//   clientIdConfigured: !!CLIENT_ID,
//   clientSecretConfigured: !!CLIENT_SECRET,
//   redirectUriConfigured: !!REDIRECT_URI
// });

// ------------------- LOGIN -------------------
router.get("/login", async (req, res) => {
  if (!OAUTH_CONFIGURED) {
    return res.status(503).send("LinkedIn OAuth is not configured on the server");
  }

  const state = crypto.randomBytes(32).toString("base64url");
  const stateHash = crypto.createHash("sha256").update(state).digest("hex");
  const accountId = req.session.accountId || req.sessionID;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  try {
    await LinkedInOAuthTransaction.create({ stateHash, accountId, expiresAt });
  } catch (err) {
    console.error("[LinkedIn OAuth] Could not create OAuth transaction", {
      message: err.message
    });
    return sendPopupResponse(res, "failed", "Could not start LinkedIn authorization");
  }

  req.session.accountId = accountId;

  // console.info("[LinkedIn OAuth] Login transaction created", {
  //   transactionCreated: true,
  //   accountBound: !!accountId,
  //   expiresAt
  // });

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
  const validState = typeof state === "string" && state.length > 0 && state.length <= 256;
  let transaction;
  try {
    if (validState) {
      const stateHash = crypto.createHash("sha256").update(state).digest("hex");
      transaction = await LinkedInOAuthTransaction.findOneAndDelete({
        stateHash,
        expiresAt: { $gt: new Date() }
      });
    }
  } catch (err) {
    console.error("[LinkedIn OAuth] Could not consume OAuth transaction", {
      message: err.message
    });
    return sendPopupResponse(res, "failed", "Could not validate LinkedIn authorization state");
  }

  // console.info("[LinkedIn OAuth] Callback received", {
  //   hasCode: !!code,
  //   hasState: validState,
  //   sessionPresent: !!req.sessionID,
  //   transactionFound: !!transaction
  // });

  if (!transaction) {
    return sendPopupResponse(res, "failed", "LinkedIn authorization state is invalid, expired, or already used");
  }

  if (typeof code !== "string" || !code) {
    const message = getQueryString(req.query.error_description)
      || getQueryString(req.query.error)
      || "Authorization code missing";
    return sendPopupResponse(res, "failed", message);
  }

  let oauthPhase = "Token exchange";
  try {
    // console.info("[LinkedIn OAuth] Exchanging authorization code");
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
    if (!accessToken || !Number.isFinite(Number(expiresIn)) || Number(expiresIn) <= 0) {
      return sendPopupResponse(res, "failed", "LinkedIn token exchange returned an incomplete response");
    }
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Get Member URN
    oauthPhase = "LinkedIn profile lookup";
    console.info("[LinkedIn OAuth] Looking up LinkedIn profile");
    const meRes = await axios.get(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "LinkedIn-Version": "20240101"
        }
      }
    );

    if (!meRes.data?.sub) {
      console.error("[LinkedIn OAuth] Profile response did not include a member ID", {
        httpStatus: meRes.status,
        response: sanitizeProviderData(meRes.data)
      });
      return sendPopupResponse(res, "failed", "LinkedIn profile response did not include a member ID");
    }

    const memberUrn = `urn:li:person:${meRes.data.sub}`;

    oauthPhase = "MongoDB token save";
    const tokenDoc = await LinkedInToken.findOneAndUpdate(
      { accountId: transaction.accountId, memberUrn },
      {
        $set: {
          accountId: transaction.accountId,
          accessToken,
          expiresAt,
          memberUrn,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    // console.info("[LinkedIn OAuth] Token saved", {
    //   saved: !!tokenDoc,
    //   memberUrn: tokenDoc?.memberUrn
    // });
    if (!tokenDoc) {
      return sendPopupResponse(res, "failed", "MongoDB did not return the saved LinkedIn account");
    }

    req.session.linkedinAccountId = transaction.accountId;
    req.session.linkedinMemberUrn = memberUrn;
    req.session.save((err) => {
      if (err) {
        console.error("[LinkedIn OAuth] Could not persist connected account session", {
          message: err.message
        });
        return sendPopupResponse(res, "failed", "LinkedIn token was saved, but the connected session could not be updated");
      }
      return sendPopupResponse(res, "success");
    });
  } catch (err) {
    if (oauthPhase === "MongoDB token save") {
      console.error("[LinkedIn OAuth] MongoDB token save failed", { message: err.message });
      return sendPopupResponse(res, "failed", `Could not save LinkedIn account: ${err.message}`);
    }

    console.error(`[LinkedIn OAuth] ${oauthPhase} failed`, {
      httpStatus: err?.response?.status,
      response: sanitizeProviderData(err?.response?.data),
      message: err?.message
    });
    const providerMessage = getQueryString(err?.response?.data?.error_description)
      || getQueryString(err?.response?.data?.message)
      || err?.message
      || "See backend logs for details";
    const status = err?.response?.status ? ` (HTTP ${err.response.status})` : "";
    return sendPopupResponse(res, "failed", `${oauthPhase} failed${status}: ${providerMessage}`);
  }
});


// ------------------- STATUS -------------------
router.get("/status", async (req, res) => {
  const memberUrn = req.session.linkedinMemberUrn;
  const accountId = req.session.linkedinAccountId || req.session.accountId || req.sessionID;

  if (!memberUrn || !accountId) return res.json({ connected: false, expired: false });

  let tokenDoc = await LinkedInToken.findOne({ accountId, memberUrn });

  if (!tokenDoc) {
    tokenDoc = await LinkedInToken.findOneAndUpdate(
      { memberUrn, accountId: { $exists: false } },
      { $set: { accountId } },
      { returnDocument: "after" }
    );
  }

  if (!tokenDoc) return res.json({ connected: false, expired: false });

  const expired = new Date() > tokenDoc.expiresAt;

  res.json({
    memberUrn,
    connected: !expired,
    expired,
    expiresAt: tokenDoc.expiresAt
  });
});

// ------------------- Helper Popup Sender -------------------
function sendPopupResponse(res, status, message) {
  const payload = JSON.stringify({
    status,
    source: "linkedin-auth",
    message: message || ""
  }).replace(/[<>&\u2028\u2029]/g, (char) => ({
    "<": "\\u003c",
    ">": "\\u003e",
    "&": "\\u0026",
    "\u2028": "\\u2028",
    "\u2029": "\\u2029"
  })[char]);
  const targetOrigin = JSON.stringify(FRONTEND_ORIGIN).replace(/[<>&\u2028\u2029]/g, (char) => ({
    "<": "\\u003c",
    ">": "\\u003e",
    "&": "\\u0026",
    "\u2028": "\\u2028",
    "\u2029": "\\u2029"
  })[char]);
  const popupAction = status === "success"
    ? "window.close();"
    : 'document.getElementById("oauth-error").textContent = response.message;';

  return res.type("html").send(`
    <html>
      <body>
        <script>
          const response = ${payload};
          window.opener?.postMessage(response, ${targetOrigin});
          ${popupAction}
        </script>
        <p id="oauth-error">${status === "success" ? "LinkedIn connected. This window will close." : "LinkedIn connection failed. You can close this window."}</p>
      </body>
    </html>
  `);
}

function getQueryString(value) {
  return typeof value === "string" ? value : "";
}

function sanitizeProviderData(value) {
  if (Array.isArray(value)) return value.map(sanitizeProviderData);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        /token|secret|code|state|authorization/i.test(key)
          ? "[redacted]"
          : sanitizeProviderData(nestedValue)
      ])
    );
  }
  return value;
}

export default router;
