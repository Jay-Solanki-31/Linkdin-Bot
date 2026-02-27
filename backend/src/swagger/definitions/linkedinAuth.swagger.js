/**
 * @swagger
 * /api/auth/linkedin/login:
 *   get:
 *     tags:
 *       - LinkedIn Auth
 *     summary: Initiate LinkedIn OAuth login
 *     description: Redirects user to LinkedIn's OAuth authorization page
 *     responses:
 *       302:
 *         description: Redirect to LinkedIn OAuth authorization URL
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/auth/linkedin/callback:
 *   get:
 *     tags:
 *       - LinkedIn Auth
 *     summary: LinkedIn OAuth callback endpoint
 *     description: Handles the OAuth callback from LinkedIn after user authorization. Opens in a popup window.
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code from LinkedIn
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *         description: State parameter for security verification
 *     responses:
 *       200:
 *         description: OAuth callback processed successfully
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid authorization code or state mismatch
 *       500:
 *         description: Token exchange failed
 */

/**
 * @swagger
 * /api/auth/linkedin/status:
 *   get:
 *     tags:
 *       - LinkedIn Auth
 *     summary: Get LinkedIn authentication status
 *     description: Check if LinkedIn OAuth token is currently valid and connected
 *     responses:
 *       200:
 *         description: Authentication status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 connected:
 *                   type: boolean
 *                   description: Whether LinkedIn is currently connected
 *                 expired:
 *                   type: boolean
 *                   description: Whether the token has expired
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                   description: Token expiration timestamp
 *       500:
 *         description: Server error
 */
