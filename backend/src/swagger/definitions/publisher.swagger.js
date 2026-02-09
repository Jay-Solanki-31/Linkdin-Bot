/**
 * @swagger
 * /api/publisher/ai-posts/{id}/publish:
 *   post:
 *     tags:
 *       - Publisher
 *     summary: Publish an AI-generated post to LinkedIn
 *     description: Publishes a generated post directly to the user's LinkedIn account
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The MongoDB ID of the AI-generated post to publish
 *     responses:
 *       200:
 *         description: Post published successfully to LinkedIn
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 postId:
 *                   type: string
 *       400:
 *         description: Post cannot be published (wrong status or missing LinkedIn token)
 *       401:
 *         description: LinkedIn authentication required
 *       404:
 *         description: Post not found
 *       500:
 *         description: Publishing failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
