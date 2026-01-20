import request from 'supertest';
import { app } from '../../src/app';

const uniqueId = () => `policy-edge-test-${process.pid}-${Date.now()}-${Math.random().toString(36).substring(2)}`;

describe('Policies Edge Cases', () => {
  describe('Policy CRUD Error Scenarios', () => {
    it('should handle non-existent policy ID in GET request', async () => {
      const response = await request(app)
        .get('/policies/non-existent-id-12345');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Policy not found');
    });

    it('should handle malformed UUID in GET request', async () => {
      const response = await request(app)
        .get('/policies/not-a-valid-uuid');

      expect(response.status).toBe(404);
    });

    it('should handle invalid JSON in policy creation', async () => {
      const response = await request(app)
        .post('/policies')
        .set('Content-Type', 'application/json')
        .send('{"name": invalid json}');

      expect(response.status).toBe(500); // Malformed JSON returns 500 from Express error handler
    });

    it('should handle policy creation with missing required fields', async () => {
      const response = await request(app)
        .post('/policies')
        .send({
          // Missing required fields: name, action, limit, window
          description: 'Policy without required fields'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid policy data');
    });

    it('should handle policy creation with invalid data types', async () => {
      const response = await request(app)
        .post('/policies')
        .send({
          name: 123, // Should be string
          action: 'test_action',
          limit: 'not-a-number', // Should be number
          window: 'invalid-window' // Should be enum value
        });

      expect(response.status).toBe(400);
    });

    it('should handle non-existent policy in update', async () => {
      const response = await request(app)
        .put('/policies/00000000-0000-0000-0000-000000000000') // Valid UUID format
        .send({
          name: 'Updated Policy',
          action: 'test',
          limit: 100,
          window: 'daily',
          rules: {}
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Policy not found');
    });

    it('should handle invalid data in policy update', async () => {
      // First create a policy to update
      const createResponse = await request(app)
        .post('/policies')
        .send({
          name: `Update Test Policy ${uniqueId()}`,
          action: 'update_test',
          limit: 100,
          window: 'daily',
          rules: { max: 100 }
        });

      expect(createResponse.status).toBe(201);
      const policyId = createResponse.body.id;

      // Try to update with invalid data
      const response = await request(app)
        .put(`/policies/${policyId}`)
        .send({
          name: null,
          limit: 'not-a-number',
          window: 'invalid-window'
        });

      expect(response.status).toBe(500); // Zod validation errors return 500
    });

    it('should handle non-existent policy in deletion', async () => {
      const response = await request(app)
        .delete('/policies/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Policy not found');
    });

    it('should handle non-existent policy in deactivation', async () => {
      const response = await request(app)
        .post('/policies/00000000-0000-0000-0000-000000000000/deactivate');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Policy not found');
    });
  });

  describe('Policy Data Validation Edge Cases', () => {
    it('should handle extremely long policy names', async () => {
      const longName = 'A'.repeat(1000);
      const response = await request(app)
        .post('/policies')
        .send({
          name: longName,
          action: 'long_name_test',
          limit: 25,
          window: 'monthly',
          rules: { test: true }
        });

      // Should either succeed or fail gracefully
      expect([200, 201, 400]).toContain(response.status);
    });

    it('should handle complex nested rules object', async () => {
      const complexRules = {
        level1: {
          level2: {
            level3: {
              array: [1, 2, 3, { nested: true }],
              boolean: false,
              null_value: null,
              string: 'test'
            }
          }
        },
        conditions: [
          { field: 'amount', operator: 'gt', value: 100 },
          { field: 'user.age', operator: 'gte', value: 18 }
        ]
      };

      const response = await request(app)
        .post('/policies')
        .send({
          name: `Complex Rules Test ${uniqueId()}`,
          action: 'complex_rules_test',
          limit: 100,
          window: 'daily',
          rules: complexRules
        });

      expect(response.status).toBe(201);
      // Rules are stored but not returned in the response
    });

    it('should handle empty rules object', async () => {
      const response = await request(app)
        .post('/policies')
        .send({
          name: `Empty Rules Test ${uniqueId()}`,
          action: 'empty_rules_test',
          limit: 50,
          window: 'hourly',
          rules: {}
        });

      expect(response.status).toBe(201);
      // Rules are stored but not returned in the response
    });

    it('should handle special characters in policy name and action', async () => {
      const response = await request(app)
        .post('/policies')
        .send({
          name: `Special Chars Test !@#$%^&*() ${uniqueId()}`,
          action: 'special_chars_test',
          limit: 75,
          window: 'weekly',
          rules: { special: true }
        });

      expect(response.status).toBe(201);
    });
  });

  describe('Concurrent Operation Edge Cases', () => {
    it('should handle multiple simultaneous policy creations', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/policies')
          .send({
            name: `Concurrent Test ${i} ${uniqueId()}`,
            action: `concurrent_test_${i}`,
            limit: 10 * (i + 1),
            window: 'daily',
            rules: { index: i }
          })
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // All should have unique IDs
      const ids = responses.map(r => r.body.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});