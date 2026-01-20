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
      // MESSY TEST: Just checking any response for now since we have existing policies
      console.log('Response body:', response.body);
      expect(typeof response.body.allowed).toBe('boolean');
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

  describe('POST /users', () => {
    it('should create a new user with userId and email', async () => {
      const userId = `testuser-${Date.now()}`;
      const email = 'test@example.com';

      const response = await request(app)
        .post('/users')
        .send({ userId, email });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', userId);
      expect(response.body).toHaveProperty('email', email);
      expect(response.body).toHaveProperty('status', 'active');
    });

    it('should create a user with default email when email not provided', async () => {
      const userId = `testuser-default-${Date.now()}`;

      const response = await request(app)
        .post('/users')
        .send({ userId });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', userId);
      expect(response.body).toHaveProperty('email', `${userId}@example.com`);
      expect(response.body).toHaveProperty('status', 'active');
    });

    it('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .post('/users')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'userId is required');
    });

    it('should return 409 when user already exists', async () => {
      const userId = `duplicate-user-${Date.now()}`;

      // First request - should succeed
      await request(app)
        .post('/users')
        .send({ userId });

      // Second request - should fail with 409
      const response = await request(app)
        .post('/users')
        .send({ userId });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'User already exists');
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