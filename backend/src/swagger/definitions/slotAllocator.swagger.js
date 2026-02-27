/**
 * @swagger
 * /api/slot-allocator/run:
 *   post:
 *     tags:
 *       - Slot Allocator
 *     summary: Run slot allocator to schedule posts
 *     description: Executes the slot allocator to automatically schedule and queue generated posts for publishing
 *     responses:
 *       200:
 *         description: Slot allocation completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 scheduled:
 *                   type: number
 *                   description: Number of posts scheduled
 *       400:
 *         description: Bad request
 *       500:
 *         description: Slot allocation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
