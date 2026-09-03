/**
 * Environment Configuration
 * Environment-specific settings and type definitions
 */

export type Environment = 'development' | 'test' | 'staging' | 'production';

export interface EnvironmentConfig {
  name: Environment;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  isStaging: boolean;
  debug: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  apiUrl: string;
  webUrl: string;
  adminUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  redisUrl: string;
  b2BucketName: string;
  features: {
    kyc: boolean;
    vip: boolean;
    realtime: boolean;
    notifications: boolean;
    moderation: boolean;
    analytics: boolean;
  };
  security: {
    corsOrigins: string[];
    rateLimitMax: number;
    rateLimitWindowMs: number;
    sessionDurationHours: number;
    jwtExpiresIn: string;
    jwtRefreshExpiresIn: string;
  };
}

function getEnvironment(): Environment {
  const env = (process.env.NODE_ENV || 'development') as Environment;
  return ['development', 'test', 'staging', 'production'].includes(env) ? env : 'development';
}

function getEnvVar(key: string, defaultValue ? : string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

function getBooleanEnvVar(key: string, defaultValue = false): boolean {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

function getNumberEnvVar(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getCorsOrigins(): string[] {
  const origins = getEnvVar('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001');
  return origins.split(',').map(origin => origin.trim()).filter(Boolean);
}

export const environment: EnvironmentConfig = {
  name: getEnvironment(),
  isProduction: getEnvironment() === 'production',
  isDevelopment: getEnvironment() === 'development',
  isTest: getEnvironment() === 'test',
  isStaging: getEnvironment() === 'staging',
  debug: getBooleanEnvVar('DEBUG', getEnvironment() === 'development'),
  logLevel: (getEnvVar('LOG_LEVEL', getEnvironment() === 'production' ? 'info' : 'debug')) as 'debug' | 'info' | 'warn' | 'error',
  apiUrl: getEnvVar('API_URL', 'http://localhost:5000'),
  webUrl: getEnvVar('APP_URL', 'http://localhost:3000'),
  adminUrl: getEnvVar('ADMIN_URL', 'http://localhost:3001'),
  supabaseUrl: getEnvVar('VITE_SUPABASE_URL', 'http://localhost:54321'),
  supabaseAnonKey: getEnvVar('VITE_SUPABASE_ANON_KEY', ''),
  redisUrl: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
  b2BucketName: getEnvVar('B2_BUCKET_NAME', 'dating-app-media'),
  features: {
    kyc: getBooleanEnvVar('FEATURE_KYC', true),
    vip: getBooleanEnvVar('FEATURE_VIP', true),
    realtime: getBooleanEnvVar('FEATURE_REALTIME', true),
    notifications: getBooleanEnvVar('FEATURE_NOTIFICATIONS', true),
    moderation: getBooleanEnvVar('FEATURE_MODERATION', true),
    analytics: getBooleanEnvVar('FEATURE_ANALYTICS', false),
  },
  security: {
    corsOrigins: getCorsOrigins(),
    rateLimitMax: getNumberEnvVar('RATE_LIMIT_MAX', 100),
    rateLimitWindowMs: getNumberEnvVar('RATE_LIMIT_WINDOW_MS', 900000),
    sessionDurationHours: getNumberEnvVar('SESSION_DURATION_HOURS', 24),
    jwtExpiresIn: getEnvVar('JWT_EXPIRES_IN', '7d'),
    jwtRefreshExpiresIn: getEnvVar('JWT_REFRESH_EXPIRES_IN', '30d'),
  },
};

// Environment-specific configurations
export const environments: Record < Environment, Partial < EnvironmentConfig >> = {
  development: {
    debug: true,
    logLevel: 'debug',
  },
  test: {
    debug: true,
    logLevel: 'debug',
  },
  staging: {
    debug: false,
    logLevel: 'info',
  },
  production: {
    debug: false,
    logLevel: 'info',
  },
};

// Helper functions
export function isProduction(): boolean {
  return environment.isProduction;
}

export function isDevelopment(): boolean {
  return environment.isDevelopment;
}

export function isTest(): boolean {
  return environment.isTest;
}

export function isStaging(): boolean {
  return environment.isStaging;
}

export function getEnvironmentConfig(): EnvironmentConfig {
  return environment;
}

export function getFeatureFlag(feature: keyof EnvironmentConfig['features']): boolean {
  return environment.features[feature];
}

export function isFeatureEnabled(feature: keyof EnvironmentConfig['features']): boolean {
  return environment.features[feature];
}