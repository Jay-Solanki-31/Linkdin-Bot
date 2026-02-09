/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: Get dashboard statistics and system status
 *     description: Retrieve comprehensive dashboard data including stats, queue status, system health, and recent activity
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   $ref: '#/components/schemas/DashboardStats'
 *                 queue:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/QueueStatus'
 *                 system:
 *                   type: object
 *                   properties:
 *                     redisConnected:
 *                       type: boolean
 *                     lastRun:
 *                       type: string
 *                       format: date-time
 *                     nextRun:
 *                       type: string
 *                       format: date-time
 *                 recentActivity:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Dashboard error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
