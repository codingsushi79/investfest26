import { z } from 'zod';

// Configuration schema with validation
const configSchema = z.object({
  // App branding
  app: z.object({
    title: z.string().default('InvestFest'),
    description: z.string().default('Virtual stock trading game'),
    version: z.string().default('1.0.0'),
  }),

  // Trading settings
  trading: z.object({
    sellToMarketPercentage: z.number().min(0).max(100).default(90),
    startingBalance: z.number().positive().default(1000),
    maxTradingPeriod: z.string().default('Y5 Q4'), // Y5 Q4
  }),

  // Feature toggles
  features: z.object({
    // Core features
    trading: z.boolean().default(true),
    leaderboard: z.boolean().default(true),
    portfolios: z.boolean().default(true),
    offers: z.boolean().default(true),

    // Advanced features
    moderatorTools: z.boolean().default(true),
    companyValues: z.boolean().default(true),
    adminPriceUpdates: z.boolean().default(true),

    // User features
    userProfiles: z.boolean().default(true),
    userRegistration: z.boolean().default(true),

    // Analytics
    analytics: z.boolean().default(true),
  }),

  // Authentication
  auth: z.object({
    operatorUsername: z.string().default('operator'),
    requireEmailVerification: z.boolean().default(false),
  }),

  // Security
  security: z.object({
    enableRateLimiting: z.boolean().default(true),
    maxRequestsPerMinute: z.number().positive().default(60),
  }),

  // Database
  database: z.object({
    url: z.string().url(),
  }),

  // External services
  services: z.object({
    nextAuthSecret: z.string(),
  }),
});

// Load configuration from environment variables
function loadConfig() {
  // Check for required environment variables
  const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  const config = {
    app: {
      title: process.env.NEXT_PUBLIC_APP_TITLE || 'InvestFest',
      description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'Virtual stock trading game',
      version: process.env.npm_package_version || '1.0.0',
    },
    trading: {
      sellToMarketPercentage: parseFloat(process.env.SELL_TO_MARKET_PERCENTAGE || '90'),
      startingBalance: parseFloat(process.env.STARTING_BALANCE || '1000'),
      maxTradingPeriod: process.env.MAX_TRADING_PERIOD || 'Y5 Q4',
    },
    features: {
      trading: process.env.FEATURE_TRADING !== 'false',
      leaderboard: process.env.FEATURE_LEADERBOARD !== 'false',
      portfolios: process.env.FEATURE_PORTFOLIOS !== 'false',
      offers: process.env.FEATURE_OFFERS !== 'false',
      moderatorTools: process.env.FEATURE_MODERATOR_TOOLS !== 'false',
      companyValues: process.env.FEATURE_COMPANY_VALUES !== 'false',
      adminPriceUpdates: process.env.FEATURE_ADMIN_PRICE_UPDATES !== 'false',
      userProfiles: process.env.FEATURE_USER_PROFILES !== 'false',
      userRegistration: process.env.FEATURE_USER_REGISTRATION !== 'false',
      analytics: process.env.FEATURE_ANALYTICS !== 'false',
    },
    auth: {
      operatorUsername: process.env.OP_USERNAME || 'operator',
      requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
    },
    security: {
      enableRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false',
      maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '60'),
    },
    database: {
      url: process.env.DATABASE_URL,
    },
    services: {
      nextAuthSecret: process.env.NEXTAUTH_SECRET,
    },
  };

  try {
    return configSchema.parse(config);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Configuration validation failed: ${error.message}`);
    }
    throw error;
  }
}

// Export the validated configuration
export const config = loadConfig();

// Export individual config sections for convenience
export const appConfig = config.app;
export const tradingConfig = config.trading;
export const featuresConfig = config.features;
export const authConfig = config.auth;
export const securityConfig = config.security;

// Type exports
export type AppConfig = typeof config.app;
export type TradingConfig = typeof config.trading;
export type FeaturesConfig = typeof config.features;
export type AuthConfig = typeof config.auth;
export type SecurityConfig = typeof config.security;
export type Config = typeof config;