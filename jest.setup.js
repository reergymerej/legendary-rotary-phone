// Set up test environment
// Use the test database URL from main .env file
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://eligibility:test_password@localhost:5436/eligibility_test_db';
process.env.PORT = '3000';
process.env.NODE_ENV = 'test';