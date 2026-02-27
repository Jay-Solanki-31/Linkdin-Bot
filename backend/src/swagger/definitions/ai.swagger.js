/**
 * @swagger
 * /ai/generate/{contentId}:
 *   post:
 *     tags:
 *       - AI
 *     summary: Generate AI content manually for a specific article
 *     description: Triggers AI content generation for a fetched article by its ID
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The MongoDB ID of the fetched content to generate AI post from
 *     responses:
 *       200:
 *         description: AI content generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid content ID or bad request
 *       404:
 *         description: Content not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
