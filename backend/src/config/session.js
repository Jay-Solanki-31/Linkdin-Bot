import session from "express-session";

export function getSessionCookieOptions(
  frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  redirectUri = process.env.LINKEDIN_REDIRECT_URI || ""
) {
  const frontendUsesHttps = new URL(frontendOrigin).protocol === "https:";
  const callbackUsesHttps = redirectUri
    ? new URL(redirectUri).protocol === "https:"
    : false;
  const useSecureCookie = frontendUsesHttps && callbackUsesHttps;

  return {
    httpOnly: true,
    secure: useSecureCookie,
    sameSite: useSecureCookie ? "none" : "lax"
  };
}

export function createSessionMiddleware() {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required");
  }

  return session({
    name: "linkedin-bot-session",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: getSessionCookieOptions()
  });
}
