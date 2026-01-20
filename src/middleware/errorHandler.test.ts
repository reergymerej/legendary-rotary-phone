import { Request, Response, NextFunction } from 'express';
import { errorHandler } from './errorHandler';

describe('errorHandler middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should log the error', () => {
    const testError = new Error('Test error');

    errorHandler(
      testError,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(consoleSpy).toHaveBeenCalledWith('Error:', testError);
  });

  it('should return 500 status with error message', () => {
    const testError = new Error('Test error');

    errorHandler(
      testError,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? 'Test error' : undefined,
    });
  });

  it('should include error message in development environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const testError = new Error('Detailed error message');

    errorHandler(
      testError,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Internal server error',
      message: 'Detailed error message',
    });

    process.env.NODE_ENV = originalEnv;
  });

  it('should not include error message in production environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const testError = new Error('Secret error details');

    errorHandler(
      testError,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Internal server error',
      message: undefined,
    });

    process.env.NODE_ENV = originalEnv;
  });
});