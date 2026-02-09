/**
 * @swagger
 * /api/ai-posts:
 *   get:
 *     tags:
 *       - AI Posts
 *     summary: Get all generated AI posts with pagination
 *     description: Retrieve a paginated list of AI-generated posts with optional filtering
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number (minimum 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *           maximum: 50
 *         description: Items per page (maximum 50)
 *     responses:
 *       200:
 *         description: Successfully retrieved AI posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GeneratedPost'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       500:
 *         description: Failed to fetch AI posts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/ai-posts/{id}:
 *   put:
 *     tags:
 *       - AI Posts
 *     summary: Update an AI-generated post
 *     description: Update title and text of a draft AI post. Cannot update posts that are queued or posted.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The MongoDB ID of the post to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Updated post title
 *               text:
 *                 type: string
 *                 description: Updated post text
 *     responses:
 *       200:
 *         description: Post updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/GeneratedPost'
 *       400:
 *         description: Cannot edit post in this status
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
