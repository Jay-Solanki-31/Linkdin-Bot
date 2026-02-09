/**
 * @swagger
 * /api/start/{source}:
 *   post:
 *     tags:
 *       - Fetcher
 *     summary: Start fetching content from a specific source
 *     description: Triggers content fetching from a specified source (devto, github, hackernews, hashnode, medium, nodeweekly, npm, reddit, etc.)
 *     parameters:
 *       - in: path
 *         name: source
 *         required: true
 *         schema:
 *           type: string
 *           enum: [devto, github, hackernews, hashnode, medium, nodeweekly, npm, reddit]
 *         description: The content source to fetch from
 *     responses:
 *       200:
 *         description: Fetch job started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 jobId:
 *                   type: string
 *       400:
 *         description: Invalid source or bad request
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/fetch:
 *   get:
 *     tags:
 *       - Fetcher
 *     summary: Get fetched content
 *     description: Retrieve content that has been fetched from various sources
 *     responses:
 *       200:
 *         description: Successfully retrieved fetched content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
