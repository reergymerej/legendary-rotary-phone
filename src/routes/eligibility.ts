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
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Find relevant policies
    const policies = await prisma.policy.findMany({
      where: {
        actionType: data.action,
        isActive: true,
        timeWindow: 'daily'
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
    for (const policy of policies) {
      // Count today's actions for this user
      const todaysActions = await prisma.actionHistory.findMany({
        where: {
          userId: data.userId,
          actionType: data.action,
          timestamp: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      });

      const totalToday = todaysActions.reduce((sum, action) => sum + action.amount, 0);
      const remaining = policy.limitAmount - totalToday;

      if (totalToday + data.amount > policy.limitAmount) {
        return res.json({
          allowed: false,
          reason: 'Daily limit exceeded',
          policy: policy.name,
          used: totalToday,
          limit: policy.limitAmount,
          requested: data.amount
        });
      }
    }

    res.json({
      allowed: true,
      message: 'Action allowed'
    });
  } catch (error) {
    console.error('Error checking eligibility:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record that an action happened
eligibilityRouter.post('/record', async (req, res) => {
  try {
    const data = recordActionSchema.parse(req.body);

    // MESSY: Direct timestamp parsing, no validation, mixed concerns
    const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();

    // Create user if doesn't exist (MESSY: should be separate service)
    await prisma.user.upsert({
      where: { email: data.userId }, // HACK: using email field for userId
      update: {},
      create: {
        email: data.userId,
        id: data.userId
      }
    });

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