// Mock the app.listen method to avoid actually starting a server
const mockListen = jest.fn((port, callback) => {
  if (callback) callback();
  return { close: jest.fn() };
});

jest.mock('./app', () => ({
  app: {
    listen: mockListen
  }
}));

import { config } from './config';

// Mock console.log to verify output
const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

describe('index.ts', () => {
  beforeEach(() => {
    mockListen.mockClear();
    consoleSpy.mockClear();
    // Clear the require cache to ensure fresh imports
    delete require.cache[require.resolve('./index')];
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  it('should start server on configured port', () => {
    // Import index to trigger the code execution
    require('./index');

    expect(mockListen).toHaveBeenCalledWith(
      config.port || 3000,
      expect.any(Function)
    );
  });

  it.skip('should log startup messages', () => {
    // Set up the listen mock to call the callback
    mockListen.mockImplementation((port: number, callback?: () => void) => {
      if (callback) callback();
      return {} as any;
    });

    // Import index to trigger the code execution
    require('./index');

    expect(consoleSpy).toHaveBeenCalledWith(`Eligibility Engine running on port ${config.port || 3000}`);
    expect(consoleSpy).toHaveBeenCalledWith(`Environment: ${config.nodeEnv}`);
  });

  it.skip('should use default port 3000 when config port is not set', () => {
    const originalPort = config.port;
    // @ts-ignore - temporarily modify config for testing
    config.port = undefined;

    // Set up the listen mock to call the callback
    mockListen.mockImplementation((port: number, callback?: () => void) => {
      if (callback) callback();
      return {} as any;
    });

    // Import index to trigger the code execution
    require('./index');

    expect(mockListen).toHaveBeenCalledWith(3000, expect.any(Function));

    // Restore original port
    // @ts-ignore
    config.port = originalPort;
  });
});