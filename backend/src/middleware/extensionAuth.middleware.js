export default function extensionAuth(
  req,
  res,
  next
) {
  const key = req.headers["x-extension-key"];

  if (
    !key ||
    key !== process.env.EXTENSION_API_KEY
  ) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  next();
}