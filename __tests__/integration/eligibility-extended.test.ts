import request from 'supertest';
import { app } from '../../src/app';

describe('Additional Eligibility API Tests', () => {
  describe('POST /eligibility/record', () => {
    it('should record an action for existing user', async () => {
      const userId = `record-user-${Date.now()}`;

      // Create user first
      await request(app)
        .post('/users')
        .send({ userId, email: 'record@example.com' });

      const response = await request(app)
        .post('/eligibility/record')
        .send({
          userId,
          action: 'api_call',
          amount: 1
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('recorded');
    });

    it('should create user automatically when recording action for non-existent user', async () => {
      const userId = `auto-create-user-${Date.now()}`;

      const response = await request(app)
        .post('/eligibility/record')
        .send({
          userId,
          action: 'api_call',
          amount: 5
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should handle custom timestamp when recording action', async () => {
      const userId = `timestamp-user-${Date.now()}`;
      const customTimestamp = new Date('2024-01-01T12:00:00Z').toISOString();

      const response = await request(app)
        .post('/eligibility/record')
        .send({
          userId,
          action: 'custom_action',
          amount: 3,
          timestamp: customTimestamp
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should return 400 for invalid record data', async () => {
      const response = await request(app)
        .post('/eligibility/record')
        .send({
          // Missing userId
          action: 'api_call',
          amount: 1
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid request data');
    });
  });

  describe('GET /eligibility/history/:userId', () => {
    it('should return user action history', async () => {
      const userId = `history-user-${Date.now()}`;

      // Record some actions first
      await request(app)
        .post('/eligibility/record')
        .send({ userId, action: 'api_call', amount: 1 });

      await request(app)
        .post('/eligibility/record')
        .send({ userId, action: 'data_access', amount: 2 });

      const response = await request(app)
        .get(`/eligibility/history/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userId', userId);
      expect(response.body).toHaveProperty('actions');
      expect(Array.isArray(response.body.actions)).toBe(true);
      expect(response.body).toHaveProperty('totalCount');
    });

    it('should filter history by days parameter', async () => {
      const userId = `days-filter-user-${Date.now()}`;

      const response = await request(app)
        .get(`/eligibility/history/${userId}`)
        .query({ days: '1' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userId', userId);
      expect(response.body).toHaveProperty('actions');
    });

    it('should use default 7 days when no days parameter provided', async () => {
      const userId = `default-days-user-${Date.now()}`;

      const response = await request(app)
        .get(`/eligibility/history/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userId', userId);
    });

    it('should return empty history for user with no actions', async () => {
      const userId = `no-actions-user-${Date.now()}`;

      const response = await request(app)
        .get(`/eligibility/history/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('actions');
      expect(response.body.actions).toHaveLength(0);
      expect(response.body).toHaveProperty('totalCount', 0);
    });
  });

  describe('POST /eligibility/check - advanced scenarios', () => {
    it('should check against active policies', async () => {
      // Create a policy first
      await request(app)
        .post('/policies')
        .send({
          name: 'Test Limit Policy',
          action: 'limited_action',
          limit: 5,
          window: 'daily'
        });

      const response = await request(app)
        .post('/eligibility/check')
        .send({
          userId: `policy-check-user-${Date.now()}`,
          action: 'limited_action',
          amount: 1
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('allowed');
      expect(typeof response.body.allowed).toBe('boolean');
    });

    it('should handle amount parameter correctly', async () => {
      const response = await request(app)
        .post('/eligibility/check')
        .send({
          userId: `amount-user-${Date.now()}`,
          action: 'bulk_action',
          amount: 10
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('allowed');
    });

    it('should handle custom timestamp in eligibility check', async () => {
      const customTimestamp = new Date('2024-01-01T12:00:00Z').toISOString();

      const response = await request(app)
        .post('/eligibility/check')
        .send({
          userId: `timestamp-check-user-${Date.now()}`,
          action: 'timestamped_action',
          amount: 1,
          timestamp: customTimestamp
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('allowed');
    });

    it('should return validation errors for malformed input', async () => {
      const response = await request(app)
        .post('/eligibility/check')
        .send({
          userId: 123, // Invalid: should be string
          action: 'test',
          amount: 'not-a-number' // Invalid: should be number
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid request data');
      expect(response.body).toHaveProperty('details');
    });
  });
});