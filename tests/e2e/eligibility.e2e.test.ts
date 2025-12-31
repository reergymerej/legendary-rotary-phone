import request from 'supertest';
import { app } from '../../src/app';

describe('Eligibility API E2E Tests', () => {
  describe('POST /eligibility/check', () => {
    it('should return allowed for basic request', async () => {
      const response = await request(app)
        .post('/eligibility/check')
        .send({
          userId: 'user123',
          action: 'api_call',
          amount: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('allowed');
      expect(response.body.allowed).toBe(true);
    });

    it('should validate request data', async () => {
      const response = await request(app)
        .post('/eligibility/check')
        .send({
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Health check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});