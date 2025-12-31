import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const eligibilityRouter = Router();

const checkEligibilitySchema = z.object({
  userId: z.string(),
  action: z.string(),
  amount: z.number().default(1),
  timestamp: z.string().optional(),
});

const recordActionSchema = z.object({
  userId: z.string(),
  action: z.string(),
  amount: z.number().default(1),
  timestamp: z.string().optional(),
});

// Check if action is allowed
eligibilityRouter.post('/check', async (req, res) => {
  try {
    const data = checkEligibilitySchema.parse(req.body);

    // INTENTIONALLY MESSY - mixing business logic with DB calls, using real Date (hard to test)
    const now = new Date();

    // Find relevant policies
    const policies = await prisma.policy.findMany({
      where: {
        actionType: data.action,
        isActive: true
      }
    });

    if (policies.length === 0) {
      // No policy = allow everything (default behavior)
      return res.json({
        allowed: true,
        message: 'No policies found, action allowed'
      });
    }

    // Check each policy (MESSY: should aggregate, not loop)
    // EVEN MESSIER: Now we need to handle multiple policies for same action
    let mostRestrictivePolicy = null;
    let mostRestrictiveViolation = null;

    for (const policy of policies) {
      // MESSY: Inline time window calculation, repeated logic
      let startTime: Date, endTime: Date;

      if (policy.timeWindow === 'hourly') {
        startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
        endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
      } else if (policy.timeWindow === 'daily') {
        startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
      } else if (policy.timeWindow === 'weekly') {
        const dayOfWeek = now.getDay();
        startTime = new Date(now.getTime() - (dayOfWeek * 24 * 60 * 60 * 1000));
        startTime.setHours(0, 0, 0, 0);
        endTime = new Date(startTime.getTime() + (7 * 24 * 60 * 60 * 1000));
      } else if (policy.timeWindow === 'monthly') {
        startTime = new Date(now.getFullYear(), now.getMonth(), 1);
        endTime = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      } else {
        // MESSY: Just skip unknown time windows
        continue;
      }

      // Count actions in this time window
      const actionsInWindow = await prisma.actionHistory.findMany({
        where: {
          userId: data.userId,
          actionType: data.action,
          timestamp: {
            gte: startTime,
            lt: endTime
          }
        }
      });

      const totalInWindow = actionsInWindow.reduce((sum, action) => sum + action.amount, 0);

      if (totalInWindow + data.amount > policy.limitAmount) {
        // MESSY: Basic "most restrictive" logic - just pick the first violation
        if (!mostRestrictiveViolation) {
          mostRestrictivePolicy = policy;
          mostRestrictiveViolation = {
            used: totalInWindow,
            limit: policy.limitAmount,
            windowStart: startTime,
            windowEnd: endTime
          };
        }
      }
    }

    // If any policy was violated, deny the request
    if (mostRestrictiveViolation && mostRestrictivePolicy) {
      return res.json({
        allowed: false,
        reason: `${mostRestrictivePolicy.timeWindow.charAt(0).toUpperCase() + mostRestrictivePolicy.timeWindow.slice(1)} limit exceeded`,
        policy: mostRestrictivePolicy.name,
        used: mostRestrictiveViolation.used,
        limit: mostRestrictiveViolation.limit,
        requested: data.amount,
        window: mostRestrictivePolicy.timeWindow,
        windowStart: mostRestrictiveViolation.windowStart.toISOString(),
        windowEnd: mostRestrictiveViolation.windowEnd.toISOString()
      });
    }

    return res.json({
      allowed: true,
      message: 'Action allowed'
    });
  } catch (error) {
    console.error('Error checking eligibility:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Record that an action happened
eligibilityRouter.post('/record', async (req, res) => {
  try {
    const data = recordActionSchema.parse(req.body);

    // MESSY: Direct timestamp parsing, no validation, mixed concerns
    const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();

    // MESSY: User management mixed in with action recording
    let user = await prisma.user.findUnique({
      where: { id: data.userId }
    });

    if (!user) {
      // MESSY: Auto-create user with minimal data, no validation
      user = await prisma.user.create({
        data: {
          id: data.userId,
          email: `${data.userId}@example.com`, // HACK: generate fake email
          status: 'active'
        }
      });
    }

    // Record the action
    const action = await prisma.actionHistory.create({
      data: {
        userId: data.userId,
        actionType: data.action,
        amount: data.amount,
        timestamp: timestamp
      }
    });

    res.json({
      recorded: true,
      actionId: action.id,
      timestamp: action.timestamp.toISOString(),
      userId: user.id
    });
  } catch (error) {
    console.error('Error recording action:', error);
    res.status(500).json({ error: 'Failed to record action' });
  }
});

// Get user's action history
eligibilityRouter.get('/history/:userId', async (req, res) => {
  const { userId } = req.params;
  const { days = '7' } = req.query; // MESSY: no validation

  try {
    // MESSY: Direct date manipulation, no abstraction
    const daysBack = parseInt(days as string) || 7;
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    const actions = await prisma.actionHistory.findMany({
      where: {
        userId: userId,
        timestamp: {
          gte: since
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    // MESSY: Could group by day/action, but just returning raw data
    res.json({
      userId,
      actions: actions.map(action => ({
        id: action.id,
        action: action.actionType,
        amount: action.amount,
        timestamp: action.timestamp.toISOString()
      })),
      totalCount: actions.length
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});