import { config } from './index';

describe('Config', () => {
  it('should have database URL', () => {
    expect(config.databaseUrl).toBeDefined();
    expect(typeof config.databaseUrl).toBe('string');
  });

  it('should have port number', () => {
    expect(config.port).toBeDefined();
    expect(typeof config.port).toBe('number');
    expect(config.port).toBeGreaterThan(0);
  });

  it('should have node environment setting', () => {
    expect(config.nodeEnv).toBeDefined();
    expect(['development', 'production', 'test']).toContain(config.nodeEnv);
  });

  it('should have optional fixed time for tests', () => {
    // This can be undefined, so just check the property exists
    expect('fixedTimeForTests' in config).toBe(true);
  });
});