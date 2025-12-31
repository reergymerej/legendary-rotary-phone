import { Router } from 'express';
import { z } from 'zod';

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

    // TODO: Implement eligibility checking logic
    // This is intentionally stub/messy for demonstration

    res.json({
      allowed: true,
      remainingQuota: 999,
      message: 'Action allowed',
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid request data' });
  }
});

// Record that an action happened
eligibilityRouter.post('/record', async (req, res) => {
  try {
    const data = recordActionSchema.parse(req.body);

    // TODO: Implement action recording logic
    // This is intentionally stub/messy for demonstration

    res.json({
      recorded: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid request data' });
  }
});

// Get user's action history
eligibilityRouter.get('/history/:userId', async (req, res) => {
  const { userId } = req.params;

  // TODO: Implement history retrieval
  // This is intentionally stub/messy for demonstration

  res.json({
    userId,
    actions: [],
    message: 'History retrieval not yet implemented',
  });
});