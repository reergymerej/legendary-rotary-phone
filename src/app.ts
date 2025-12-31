import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import { eligibilityRouter } from './routes/eligibility';
import { policyRouter } from './routes/policies';
import { errorHandler } from './middleware/errorHandler';

const prisma = new PrismaClient();

export const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/eligibility', eligibilityRouter);
app.use('/policies', policyRouter);

// MESSY: Quick user management endpoint thrown in
app.post('/users', async (req, res) => {
  try {
    const { userId, email } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const user = await prisma.user.create({
      data: {
        id: userId,
        email: email || `${userId}@example.com`,
        status: 'active'
      }
    });

    return res.status(201).json({ id: user.id, email: user.email, status: user.status });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'User already exists' });
    } else {
      return res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

app.get('/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ id: user.id, email: user.email, status: user.status });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Error handling
app.use(errorHandler);

export default app;