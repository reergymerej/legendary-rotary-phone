import request from 'supertest';
import { app } from '../../src/app';

describe('Policy API Integration Tests', () => {
  const samplePolicy = {
    name: 'Test Daily Limit',
    action: 'api_call',
    limit: 100,
    window: 'daily' as const,
    rules: { description: 'Test policy' }
  };

  describe('POST /policies', () => {
    it('should create a new policy', async () => {
      const response = await request(app)
        .post('/policies')
        .send(samplePolicy);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', samplePolicy.name);
      expect(response.body).toHaveProperty('action', samplePolicy.action);
      expect(response.body).toHaveProperty('limit', samplePolicy.limit);
      expect(response.body).toHaveProperty('window', samplePolicy.window);
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should return 400 for invalid policy data', async () => {
      const invalidPolicy = {
        name: '', // Invalid: empty name
        action: 'test',
        limit: -1, // Invalid: negative limit
        window: 'invalid' // Invalid: not in enum
      };

      const response = await request(app)
        .post('/policies')
        .send(invalidPolicy);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /policies', () => {
    it('should return list of active policies', async () => {
      // Create a test policy first
      await request(app)
        .post('/policies')
        .send(samplePolicy);

      const response = await request(app).get('/policies');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('policies');
      expect(Array.isArray(response.body.policies)).toBe(true);
    });
  });

  describe('GET /policies/:id', () => {
    it('should return specific policy when found', async () => {
      // Create a policy first
      const createResponse = await request(app)
        .post('/policies')
        .send(samplePolicy);

      const policyId = createResponse.body.id;
      const response = await request(app).get(`/policies/${policyId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', policyId);
      expect(response.body).toHaveProperty('name', samplePolicy.name);
      expect(response.body).toHaveProperty('action', samplePolicy.action);
      expect(response.body).toHaveProperty('rules');
      expect(response.body).toHaveProperty('isActive');
    });

    it('should return 404 when policy not found', async () => {
      const nonExistentId = 'non-existent-id';
      const response = await request(app).get(`/policies/${nonExistentId}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Policy not found');
    });
  });

  describe('PUT /policies/:id', () => {
    it('should update existing policy', async () => {
      // Create a policy first
      const createResponse = await request(app)
        .post('/policies')
        .send(samplePolicy);

      const policyId = createResponse.body.id;
      const updatedPolicy = {
        ...samplePolicy,
        name: 'Updated Policy Name',
        limit: 200
      };

      const response = await request(app)
        .put(`/policies/${policyId}`)
        .send(updatedPolicy);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'Updated Policy Name');
      expect(response.body).toHaveProperty('limit', 200);
    });

    it('should return 404 when updating non-existent policy', async () => {
      const nonExistentId = 'non-existent-id';
      const response = await request(app)
        .put(`/policies/${nonExistentId}`)
        .send(samplePolicy);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /policies/:id/deactivate', () => {
    it('should deactivate existing policy', async () => {
      // Create a policy first
      const createResponse = await request(app)
        .post('/policies')
        .send(samplePolicy);

      const policyId = createResponse.body.id;
      const response = await request(app)
        .post(`/policies/${policyId}/deactivate`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Policy deactivated');
      expect(response.body).toHaveProperty('isActive', false);

      // Verify policy is no longer active
      const getResponse = await request(app).get(`/policies/${policyId}`);
      expect(getResponse.body).toHaveProperty('isActive', false);
    });

    it('should return 404 when deactivating non-existent policy', async () => {
      const nonExistentId = 'non-existent-id';
      const response = await request(app)
        .post(`/policies/${nonExistentId}/deactivate`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Policy not found');
    });
  });

  describe('DELETE /policies/:id', () => {
    it('should delete existing policy', async () => {
      // Create a policy first
      const createResponse = await request(app)
        .post('/policies')
        .send(samplePolicy);

      const policyId = createResponse.body.id;
      const response = await request(app).delete(`/policies/${policyId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Policy deleted');

      // Verify policy no longer exists
      const getResponse = await request(app).get(`/policies/${policyId}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 when deleting non-existent policy', async () => {
      const nonExistentId = 'non-existent-id';
      const response = await request(app).delete(`/policies/${nonExistentId}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Policy not found');
    });
  });
});