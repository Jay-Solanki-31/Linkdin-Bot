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
      event: "persistence_failed"
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
      event: "persistence_failed"
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

    // Preserve the established userinfo sub -> memberUrn mapping.
    oauthPhase = "LinkedIn profile lookup";
    let profile = {};
    let memberUrn;
    try {
      const { data } = await axios.get("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` }, timeout: 10000
      });
      if (typeof data?.sub !== "string" || !data.sub.trim()) throw new Error("Missing subject");
      memberUrn = `urn:li:person:${data.sub}`;
      profile = profileFields(data);
    } catch {
      console.warn("[LinkedIn OAuth] Profile unavailable", { event: "profile_unavailable" });
      // Only recover an exactly matching existing identity, never guess from the session.
      try {
        const { data } = await axios.get("https://api.linkedin.com/v2/me", {
          headers: { Authorization: `Bearer ${accessToken}` }, timeout: 10000
        });
        const existing = typeof data?.id === "string"
          ? await LinkedInToken.findOne({ memberUrn: `urn:li:person:${data.id}` }) : null;
        if (existing) memberUrn = existing.memberUrn;
      } catch { /* Preserve the previous connection when identity cannot be verified. */ }
      if (!memberUrn) return sendPopupResponse(res, "failed", "LinkedIn identity could not be verified. Your existing connection is unchanged; please retry.");
    }
    const existingAccount = await LinkedInToken.findOne({ memberUrn });
    const accountId = existingAccount?.accountId || transaction.accountId;

    oauthPhase = "MongoDB token save";
    const tokenDoc = await LinkedInToken.findOneAndUpdate(
      { memberUrn },
      {
        $set: {
          ...(existingAccount && !existingAccount.accountId ? { accountId } : {}),
          ...profile,
          accessToken,
          expiresAt,
          memberUrn,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date(), ...(!existingAccount || existingAccount.accountId ? { accountId } : {}) },
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

    console.info("[LinkedIn OAuth] Account connected", {
      event: "account_connected", memberUrn, displayName: tokenDoc.displayName || "LinkedIn account"
    });
    req.session.linkedinAccountId = tokenDoc.accountId || accountId;
    req.session.linkedinMemberUrn = memberUrn;
    req.session.save((err) => {
      if (err) {
        console.error("[LinkedIn OAuth] Could not persist connected account session", {
          event: "persistence_failed"
        });
        return sendPopupResponse(res, "failed", "LinkedIn token was saved, but the connected session could not be updated");
      }
      return sendPopupResponse(res, "success");
    });
  } catch (err) {
    if (oauthPhase === "MongoDB token save") {
      console.error("[LinkedIn OAuth] MongoDB token save failed", { event: "persistence_failed" });
      return sendPopupResponse(res, "failed", "Could not save LinkedIn account. Please retry.");
    }

    console.error(`[LinkedIn OAuth] ${oauthPhase} failed`, {
      httpStatus: err?.response?.status,
      event: "oauth_failed"
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
    displayName: tokenDoc.displayName || "LinkedIn account",
    ...(safePicture(tokenDoc.profilePicture) ? { profilePicture: tokenDoc.profilePicture } : {}),
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

function safePicture(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}

function profileFields(data) {
  const clean = (value) => typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 200) : "";
  const givenName = clean(data.given_name);
  const familyName = clean(data.family_name);
  const displayName = clean(data.name) || [givenName, familyName].filter(Boolean).join(" ");
  if (!displayName) console.warn("[LinkedIn OAuth] Profile name unavailable", {
    event: "profile_name_unavailable", memberUrn: `urn:li:person:${data.sub}`
  });
  return { displayName, givenName, familyName,
    profilePicture: safePicture(data.picture) ? data.picture : "", profileUpdatedAt: new Date() };
}

export default router;
