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
    companyValues: z.boolean().default(true),
    adminPriceUpdates: z.boolean().default(true),
    userProfiles: z.boolean().default(true),
    userRegistration: z.boolean().default(true),
    analytics: z.boolean().default(true),
    crypto: z.boolean().default(true),
    cryptoCreation: z.boolean().default(true),
    cryptoTrading: z.boolean().default(true),
    firms: z.boolean().default(true),
    firmCreation: z.boolean().default(true),
    firmTrading: z.boolean().default(true),
    bulkPriceUpdates: z.boolean().default(true),
    news: z.boolean().default(true),
    newsEmail: z.boolean().default(true),
    firmNews: z.boolean().default(true),
    firmNewsEmail: z.boolean().default(true),
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
  crypto: z.object({
    // How often the autonomous price walk takes a step, in seconds.
    tickSeconds: z.number().positive().default(60),
    // Defaults applied to a new coin when the operator does not override them.
    defaultStartPrice: z.number().positive().default(1),
    defaultVolatility: z.number().min(0).max(1).default(0.02),
    defaultTrendPercentPerHour: z.number().min(-100).max(100).default(0),
    minPrice: z.number().positive().default(0.01),
    // Hard ceilings on how a coin may be configured. A coin that trends up
    // fast enough is just free money for whoever holds it, so the trend is
    // capped in human units (percent per hour) rather than raw log-drift.
    maxTrendPercentPerHour: z.number().min(0).max(100).default(15),
    maxVolatility: z.number().min(0.0001).max(0.5).default(0.06),
    // Cash cut taken by the house on each crypto sale, as a percentage.
    sellFeePercentage: z.number().min(0).max(100).default(0),
    maxCoins: z.number().int().positive().default(50),
    // How many historical ticks the price chart renders.
    historyPoints: z.number().int().positive().default(60),
  }),
  firms: z.object({
    // Percentage of a client deposit the firm may keep as a fee.
    maxFeePercentage: z.number().min(0).max(100).default(10),
    minDeposit: z.number().positive().default(10),
    maxPerManager: z.number().int().positive().default(1),
    maxMembers: z.number().int().positive().default(100),
    // Managers may trade crypto with pooled client capital.
    allowCrypto: z.boolean().default(true),
  }),
  features: z.object({
    trading: z.boolean().default(true),
    leaderboard: z.boolean().default(true),
    portfolios: z.boolean().default(true),
    offers: z.boolean().default(true),
    companyValues: z.boolean().default(true),
    adminPriceUpdates: z.boolean().default(true),
    userProfiles: z.boolean().default(true),
    userRegistration: z.boolean().default(true),
    analytics: z.boolean().default(true),
    crypto: z.boolean().default(true),
    cryptoCreation: z.boolean().default(true),
    cryptoTrading: z.boolean().default(true),
    firms: z.boolean().default(true),
    firmCreation: z.boolean().default(true),
    firmTrading: z.boolean().default(true),
    bulkPriceUpdates: z.boolean().default(true),
    news: z.boolean().default(true),
    newsEmail: z.boolean().default(true),
    firmNews: z.boolean().default(true),
    firmNewsEmail: z.boolean().default(true),
  }),
  auth: z.object({
    operatorUsername: z.string().default('operator'),
    requireEmailVerification: z.boolean().default(false),
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
      companyValues: process.env.NEXT_PUBLIC_FEATURE_COMPANY_VALUES !== 'false',
      adminPriceUpdates: process.env.NEXT_PUBLIC_FEATURE_ADMIN_PRICE_UPDATES !== 'false',
      userProfiles: process.env.NEXT_PUBLIC_FEATURE_USER_PROFILES !== 'false',
      userRegistration: process.env.NEXT_PUBLIC_FEATURE_USER_REGISTRATION !== 'false',
      analytics: process.env.NEXT_PUBLIC_FEATURE_ANALYTICS !== 'false',
      crypto: process.env.NEXT_PUBLIC_FEATURE_CRYPTO !== 'false',
      cryptoCreation: process.env.NEXT_PUBLIC_FEATURE_CRYPTO_CREATION !== 'false',
      cryptoTrading: process.env.NEXT_PUBLIC_FEATURE_CRYPTO_TRADING !== 'false',
      firms: process.env.NEXT_PUBLIC_FEATURE_FIRMS !== 'false',
      firmCreation: process.env.NEXT_PUBLIC_FEATURE_FIRM_CREATION !== 'false',
      firmTrading: process.env.NEXT_PUBLIC_FEATURE_FIRM_TRADING !== 'false',
      bulkPriceUpdates: process.env.NEXT_PUBLIC_FEATURE_BULK_PRICE_UPDATES !== 'false',
      news: process.env.NEXT_PUBLIC_FEATURE_NEWS !== 'false',
      newsEmail: process.env.NEXT_PUBLIC_FEATURE_NEWS_EMAIL !== 'false',
      firmNews: process.env.NEXT_PUBLIC_FEATURE_FIRM_NEWS !== 'false',
      firmNewsEmail: process.env.NEXT_PUBLIC_FEATURE_FIRM_NEWS_EMAIL !== 'false',
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
    crypto: {
      tickSeconds: parseFloat(process.env.CRYPTO_TICK_SECONDS || '60'),
      defaultStartPrice: parseFloat(process.env.CRYPTO_DEFAULT_START_PRICE || '1'),
      defaultVolatility: parseFloat(process.env.CRYPTO_DEFAULT_VOLATILITY || '0.02'),
      defaultTrendPercentPerHour: parseFloat(
        process.env.CRYPTO_DEFAULT_TREND_PERCENT_PER_HOUR || '0'
      ),
      minPrice: parseFloat(process.env.CRYPTO_MIN_PRICE || '0.01'),
      maxTrendPercentPerHour: parseFloat(
        process.env.CRYPTO_MAX_TREND_PERCENT_PER_HOUR || '15'
      ),
      maxVolatility: parseFloat(process.env.CRYPTO_MAX_VOLATILITY || '0.06'),
      sellFeePercentage: parseFloat(process.env.CRYPTO_SELL_FEE_PERCENTAGE || '0'),
      maxCoins: parseInt(process.env.CRYPTO_MAX_COINS || '50'),
      historyPoints: parseInt(process.env.CRYPTO_HISTORY_POINTS || '60'),
    },
    firms: {
      maxFeePercentage: parseFloat(process.env.FIRM_MAX_FEE_PERCENTAGE || '10'),
      minDeposit: parseFloat(process.env.FIRM_MIN_DEPOSIT || '10'),
      maxPerManager: parseInt(process.env.FIRM_MAX_PER_MANAGER || '1'),
      maxMembers: parseInt(process.env.FIRM_MAX_MEMBERS || '100'),
      allowCrypto: process.env.FIRM_ALLOW_CRYPTO !== 'false',
    },
    features: {
      trading: process.env.FEATURE_TRADING !== 'false',
      leaderboard: process.env.FEATURE_LEADERBOARD !== 'false',
      portfolios: process.env.FEATURE_PORTFOLIOS !== 'false',
      offers: process.env.FEATURE_OFFERS !== 'false',
      companyValues: process.env.FEATURE_COMPANY_VALUES !== 'false',
      adminPriceUpdates: process.env.FEATURE_ADMIN_PRICE_UPDATES !== 'false',
      userProfiles: process.env.FEATURE_USER_PROFILES !== 'false',
      userRegistration: process.env.FEATURE_USER_REGISTRATION !== 'false',
      analytics: process.env.FEATURE_ANALYTICS !== 'false',
      crypto: process.env.FEATURE_CRYPTO !== 'false',
      cryptoCreation: process.env.FEATURE_CRYPTO_CREATION !== 'false',
      cryptoTrading: process.env.FEATURE_CRYPTO_TRADING !== 'false',
      firms: process.env.FEATURE_FIRMS !== 'false',
      firmCreation: process.env.FEATURE_FIRM_CREATION !== 'false',
      firmTrading: process.env.FEATURE_FIRM_TRADING !== 'false',
      bulkPriceUpdates: process.env.FEATURE_BULK_PRICE_UPDATES !== 'false',
      news: process.env.FEATURE_NEWS !== 'false',
      newsEmail: process.env.FEATURE_NEWS_EMAIL !== 'false',
      firmNews: process.env.FEATURE_FIRM_NEWS !== 'false',
      firmNewsEmail: process.env.FEATURE_FIRM_NEWS_EMAIL !== 'false',
    },
    auth: {
      operatorUsername: process.env.OP_USERNAME || 'operator',
      requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
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

export function getCryptoConfig() {
  return getServerConfig().crypto;
}

export function getFirmConfig() {
  return getServerConfig().firms;
}

export function getFeaturesConfig() {
  return getServerConfig().features;
}

/** Throws unless every named server-side feature flag is enabled. */
export function assertFeatures(...names: Array<keyof ReturnType<typeof getFeaturesConfig>>) {
  const features = getFeaturesConfig();
  const disabled = names.filter((name) => !features[name]);
  if (disabled.length > 0) {
    throw new Error(`Feature disabled: ${disabled.join(', ')}`);
  }
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
export type CryptoConfig = ReturnType<typeof getCryptoConfig>;
export type FirmConfig = ReturnType<typeof getFirmConfig>;
export type Config = ReturnType<typeof getServerConfig>;