import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const policyRouter = Router();

const createPolicySchema = z.object({
  name: z.string(),
  action: z.string(),
  limit: z.number(),
  window: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
  rules: z.record(z.any()).optional(),
});

// List all policies
policyRouter.get('/', async (req, res) => {
  try {
    const policies = await prisma.policy.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      policies: policies.map(p => ({
        id: p.id,
        name: p.name,
        action: p.actionType,
        limit: p.limitAmount,
        window: p.timeWindow,
        createdAt: p.createdAt.toISOString()
      }))
    });
  } catch (error) {
    console.error('Error listing policies:', error);
    res.status(500).json({ error: 'Failed to list policies' });
  }
});

// Create new policy
policyRouter.post('/', async (req, res) => {
  try {
    const data = createPolicySchema.parse(req.body);

    // MESSY: No duplicate checking, no validation of business rules
    const policy = await prisma.policy.create({
      data: {
        name: data.name,
        actionType: data.action,
        limitAmount: data.limit,
        timeWindow: data.window,
        rulesJson: data.rules || {}
      }
    });

    res.status(201).json({
      id: policy.id,
      name: policy.name,
      action: policy.actionType,
      limit: policy.limitAmount,
      window: policy.timeWindow,
      createdAt: policy.createdAt.toISOString()
    });
  } catch (error) {
    console.error('Error creating policy:', error);
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

// Get specific policy
policyRouter.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const policy = await prisma.policy.findUnique({
      where: { id }
    });

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json({
      id: policy.id,
      name: policy.name,
      action: policy.actionType,
      limit: policy.limitAmount,
      window: policy.timeWindow,
      rules: policy.rulesJson,
      isActive: policy.isActive,
      createdAt: policy.createdAt.toISOString()
    });
  } catch (error) {
    console.error('Error fetching policy:', error);
    res.status(500).json({ error: 'Failed to fetch policy' });
  }
});