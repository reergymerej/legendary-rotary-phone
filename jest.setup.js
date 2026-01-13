// Set up test environment
require('dotenv').config({ path: '.env.test' });

// Additional test environment setup
process.env.PORT = '3000';
process.env.NODE_ENV = 'test';