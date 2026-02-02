import { z } from 'zod';

// Client-safe configuration schema (only NEXT_PUBLIC variables)
const clientConfigSchema = z.object({
  app: z.object({
    title: z.string().default('InvestFest'),
    description: z.string().default('Virtual stock trading game'),
  }),
  features: z.object({
    trading: z.boolean().default(true),
    leaderboard: z.boolean().default(true),
    portfolios: z.boolean().default(true),
    offers: z.boolean().default(true),
    moderatorTools: z.boolean().default(true),
    companyValues: z.boolean().default(true),
    adminPriceUpdates: z.boolean().default(true),
    userProfiles: z.boolean().default(true),
    userRegistration: z.boolean().default(true),
    analytics: z.boolean().default(true),
  }),
  auth: z.object({
    operatorUsername: z.string().default('operator'),
  }),
});

// Full server configuration schema
const serverConfigSchema = z.object({
  app: z.object({
    title: z.string().default('InvestFest'),
    description: z.string().default('Virtual stock trading game'),
    version: z.string().default('1.0.0'),
  }),
  trading: z.object({
    sellToMarketPercentage: z.number().min(0).max(100).default(90),
    startingBalance: z.number().positive().default(1000),
    maxTradingPeriod: z.string().default('Y5 Q4'),
  }),
  features: z.object({
    trading: z.boolean().default(true),
    leaderboard: z.boolean().default(true),
    portfolios: z.boolean().default(true),
    offers: z.boolean().default(true),
    moderatorTools: z.boolean().default(true),
    companyValues: z.boolean().default(true),
    adminPriceUpdates: z.boolean().default(true),
    userProfiles: z.boolean().default(true),
    userRegistration: z.boolean().default(true),
    analytics: z.boolean().default(true),
  }),
  auth: z.object({
    operatorUsername: z.string().default('operator'),
    requireEmailVerification: z.boolean().default(false),
  }),
  security: z.object({
    enableRateLimiting: z.boolean().default(true),
    maxRequestsPerMinute: z.number().positive().default(60),
  }),
  database: z.object({
    url: z.string().url(),
  }),
  services: z.object({
    nextAuthSecret: z.string(),
  }),
});

// Load client-safe configuration (only NEXT_PUBLIC variables)
function loadClientConfig() {
  const config = {
    app: {
      title: process.env.NEXT_PUBLIC_APP_TITLE || 'InvestFest',
      description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'Virtual stock trading game',
    },
    features: {
      trading: process.env.NEXT_PUBLIC_FEATURE_TRADING !== 'false',
      leaderboard: process.env.NEXT_PUBLIC_FEATURE_LEADERBOARD !== 'false',
      portfolios: process.env.NEXT_PUBLIC_FEATURE_PORTFOLIOS !== 'false',
      offers: process.env.NEXT_PUBLIC_FEATURE_OFFERS !== 'false',
      moderatorTools: process.env.NEXT_PUBLIC_FEATURE_MODERATOR_TOOLS !== 'false',
      companyValues: process.env.NEXT_PUBLIC_FEATURE_COMPANY_VALUES !== 'false',
      adminPriceUpdates: process.env.NEXT_PUBLIC_FEATURE_ADMIN_PRICE_UPDATES !== 'false',
      userProfiles: process.env.NEXT_PUBLIC_FEATURE_USER_PROFILES !== 'false',
      userRegistration: process.env.NEXT_PUBLIC_FEATURE_USER_REGISTRATION !== 'false',
      analytics: process.env.NEXT_PUBLIC_FEATURE_ANALYTICS !== 'false',
    },
    auth: {
      operatorUsername: process.env.NEXT_PUBLIC_OP_USERNAME || 'operator',
    },
  };

  return clientConfigSchema.parse(config);
}

// Load full server configuration (only call on server-side)
function loadServerConfig() {
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
      url: process.env.DATABASE_URL!,
    },
    services: {
      nextAuthSecret: process.env.NEXTAUTH_SECRET!,
    },
  };

  try {
    return serverConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Configuration validation failed: ${error.message}`);
    }
    throw error;
  }
}

// Export client-safe configuration (safe to use in client components)
export const clientConfig = loadClientConfig();

// Export individual client config sections for convenience
export const appConfig = clientConfig.app;
export const featuresConfig = clientConfig.features;
export const authConfig = clientConfig.auth;

// Server-side configuration (only available in server contexts)
let serverConfig: ReturnType<typeof loadServerConfig> | null = null;

export function getServerConfig() {
  if (typeof window !== 'undefined') {
    throw new Error('Server config cannot be accessed on the client side');
  }

  if (!serverConfig) {
    serverConfig = loadServerConfig();
  }

  return serverConfig;
}

// Export server config sections (only use in server contexts)
export function getTradingConfig() {
  return getServerConfig().trading;
}

export function getSecurityConfig() {
  return getServerConfig().security;
}

export function getDatabaseConfig() {
  return getServerConfig().database;
}

export function getServicesConfig() {
  return getServerConfig().services;
}

// Type exports
export type AppConfig = typeof clientConfig.app;
export type TradingConfig = ReturnType<typeof getTradingConfig>;
export type FeaturesConfig = typeof clientConfig.features;
export type AuthConfig = typeof clientConfig.auth;
export type SecurityConfig = ReturnType<typeof getSecurityConfig>;
export type Config = ReturnType<typeof getServerConfig>;