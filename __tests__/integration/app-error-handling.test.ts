import request from 'supertest';
import { app } from '../../src/app';

const uniqueId = () => `app-test-${process.pid}-${Date.now()}-${Math.random().toString(36).substring(2)}`;

describe('App-level Error Handling', () => {
  describe('User Management Errors', () => {
    it('should handle invalid JSON in user creation', async () => {
      const response = await request(app)
        .post('/users')
        .set('Content-Type', 'application/json')
        .send('{"name": invalid json}');

      expect(response.status).toBe(500); // Express error handler returns 500 for malformed JSON
    });

    it('should handle missing required fields in user creation', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          // Missing name field
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid data types in user creation', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          name: 123, // Should be string
          email: null // Should be string
        });

      expect(response.status).toBe(400);
    });

    it('should handle non-existent user in GET request', async () => {
      const response = await request(app)
        .get('/users/non-existent-user-id');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'User not found');
    });

    it('should handle database errors during user creation', async () => {
      // Try to create user with extremely long values that might cause DB errors
      const response = await request(app)
        .post('/users')
        .send({
          name: 'A'.repeat(10000), // Very long name
          email: `${'a'.repeat(100)}@${'b'.repeat(100)}.com` // Very long email
        });

      // Should either succeed with truncation or fail gracefully
      expect([201, 400, 422]).toContain(response.status);
    });
  });

  describe('Content-Type and Request Parsing', () => {
    it('should handle requests with no Content-Type header', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          name: `No Content Type ${uniqueId()}`,
          email: `nocontenttype-${uniqueId()}@test.com`
        });

      // Express should handle this gracefully
      expect([200, 201, 400]).toContain(response.status);
    });

    it('should handle requests with incorrect Content-Type', async () => {
      const response = await request(app)
        .post('/users')
        .set('Content-Type', 'text/plain')
        .send(JSON.stringify({
          name: `Wrong Content Type ${uniqueId()}`,
          email: `wrongtype-${uniqueId()}@test.com`
        }));

      expect([200, 201, 400]).toContain(response.status);
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .post('/users')
        .send('');

      expect(response.status).toBe(400);
    });
  });

  describe('Route Error Handling', () => {
    it('should handle non-existent routes gracefully', async () => {
      const response = await request(app)
        .get('/non-existent-route');

      expect(response.status).toBe(404);
    });

    it('should handle unsupported HTTP methods', async () => {
      const response = await request(app)
        .patch('/health');

      expect(response.status).toBe(404);
    });

    it('should handle routes with query parameters', async () => {
      const response = await request(app)
        .get('/health')
        .query({
          test: 'parameter',
          number: 123,
          array: ['a', 'b', 'c']
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Middleware Error Handling', () => {
    it('should handle large request payloads', async () => {
      const largePayload = {
        name: `Large Payload Test ${uniqueId()}`,
        email: `largepayload-${uniqueId()}@test.com`,
        data: 'x'.repeat(100000) // 100KB of data
      };

      const response = await request(app)
        .post('/users')
        .send(largePayload);

      // Should either succeed or fail gracefully with 413 or 400
      expect([200, 201, 400, 413]).toContain(response.status);
    });

    it('should handle requests with special characters in URL', async () => {
      const response = await request(app)
        .get('/users/test%20user%20with%20spaces');

      // Should handle URL encoding
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Health Check Edge Cases', () => {
    it('should handle health check with various Accept headers', async () => {
      const acceptHeaders = [
        'application/json',
        'text/plain',
        'application/xml',
        '*/*',
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      ];

      for (const accept of acceptHeaders) {
        const response = await request(app)
          .get('/health')
          .set('Accept', accept);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'ok');
        expect(response.body).toHaveProperty('timestamp');
      }
    });

    it('should handle concurrent health check requests', async () => {
      const promises = Array.from({ length: 10 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'ok');
        expect(response.body).toHaveProperty('timestamp');
      });
    });
  });
});