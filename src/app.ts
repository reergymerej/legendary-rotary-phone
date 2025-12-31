import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { eligibilityRouter } from './routes/eligibility';
import { policyRouter } from './routes/policies';
import { errorHandler } from './middleware/errorHandler';

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

// Error handling
app.use(errorHandler);

export default app;