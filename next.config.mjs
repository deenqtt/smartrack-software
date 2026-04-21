/** @type {import('next').NextConfig} */
import withBundleAnalyzer from "@next/bundle-analyzer";

const bundleAnalyzerConfig = {
  enabled: process.env.ANALYZE === "true",
};

const nextConfig = {
  // output: "standalone" removed — not needed for Vercel deployment

  // Fix for _define_property is not defined error with maplibre-gl
  transpilePackages: ["maplibre-gl"],

  // Keep Prisma as external package so it works correctly in API routes (Node.js runtime)
  serverExternalPackages: ["@prisma/client", "prisma"],

  // Disable static generation for dynamic routes
  generateBuildId: async () => {
    return "build-" + Date.now();
  },

  // Disable bundle analyzer for now to simplify build
  ...(bundleAnalyzerConfig.enabled && bundleAnalyzerConfig),

  // Development optimizations - STABLE DEVELOPMENT SERVER
  ...(process.env.NODE_ENV === "development" && {
    // Increase memory thresholds to prevent unnecessary restarts
    experimental: {
      optimizePackageImports: [
        "lucide-react",
        "date-fns",
        "lodash",
        "recharts",
        "echarts",
        "@radix-ui/react-icons",
        "lucide-react",
      ],
      optimizeCss: true,
      scrollRestoration: true,
      optimizeCss: true,
      scrollRestoration: true,
    },
    // Turbopack configuration moved to top-level for Next.js 15
    turbopack: {
      // Memory limit is not a recognized key here in Next.js 15
    },
    // Increase onDemandEntries limits
    onDemandEntries: {
      maxInactiveAge: 60 * 1000, // 1 minute (increased)
      pagesBufferLength: 5, // Allow more pages in buffer
    },
    // Development indicators configuration for Next.js 15+
    // Development indicators configuration for Next.js 15+
    // Development indicators configuration for Next.js 15+
    // devIndicators removed as they are deprecated
  }),

  // Build optimization
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Performance optimizations
  compress: true, // Enable gzip/brotli compression
  poweredByHeader: false, // Remove X-Powered-By header for security

  // Security and performance headers for production
  ...(process.env.NODE_ENV === "production" && {
    async headers() {
      return [
        {
          // Cache static assets aggressively in production
          source: "/_next/static/(.*)",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=31536000, immutable",
            },
          ],
        },
        // Add security headers
        {
          source: "/(.*)",
          headers: [
            {
              key: "X-Frame-Options",
              value: "DENY",
            },
            {
              key: "X-Content-Type-Options",
              value: "nosniff",
            },
            {
              key: "Referrer-Policy",
              value: "strict-origin-when-cross-origin",
            },
            {
              key: "Permissions-Policy",
              value: "camera=(), microphone=(), geolocation=()",
            },
          ],
        },
      ];
    },
  }),

  // Image optimization
  images: {
    unoptimized: false, // Enable Next.js image optimization
    formats: ["image/webp", "image/avif"], // Modern image formats
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    minimumCacheTTL: process.env.NODE_ENV === "production" ? 31536000 : 0, // No cache in dev
  },

  // Compiler options for production
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
          exclude: ["error"],
        }
        : false,
  },

  // Webpack optimizations for memory and performance
  webpack: (config, options) => {
    const { dev, isServer, webpack: webpackInstance } = options;

    // Add basic polyfills for server-side rendering
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // Development-specific optimizations
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/node_modules/**", "**/.next/**"],
      };
      // Use filesystem cache for better performance
      config.cache = {
        type: "filesystem",
        buildDependencies: {
          config: ["./next.config.mjs"],
        },
        name: `smartrack-dev-cache-${options.nextRuntime || "client"}`,
      };
      // Reduce memory usage by limiting concurrent compilations
      config.parallelism = 2;
    }

    // Production build optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: true,
        splitChunks: {
          chunks: "all",
          maxInitialRequests: 25,
          maxAsyncRequests: 25,
          minSize: 20000,
          cacheGroups: {
            radix: {
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              name: "radix-ui",
              priority: 40,
            },
            charts: {
              test: /[\\/]node_modules[\\/](echarts|recharts|chart\.js)[\\/]/,
              name: "charts",
              chunks: "async",
              priority: 35,
            },
            maps: {
              test: /[\\/]node_modules[\\/](leaflet|maplibre|@mapbox)[\\/]/,
              name: "maps",
              chunks: "async",
              priority: 30,
            },
            three: {
              test: /[\\/]node_modules[\\/](three|troika-three-text|@react-three)[\\/]/,
              name: "threejs",
              chunks: "async",
              priority: 25,
            },
          },
        },
        removeAvailableModules: true,
        removeEmptyChunks: true,
        mergeDuplicateChunks: true,
        concatenateModules: true,
      };

      // Optimize webpack cache to reduce serialization warnings
      config.cache = {
        type: "filesystem",
        buildDependencies: {
          config: ["./next.config.mjs"],
        },
        name: `smartrack-build-cache-${options.nextRuntime || "client"}`,
      };

      // Optimize CSS processing
      if (config.module?.rules) {
        config.module.rules.forEach((rule) => {
          if (rule.test && rule.test.toString().includes("css")) {
            if (rule.use) {
              rule.use.forEach((use) => {
                if (use.loader && use.loader.includes("css-loader")) {
                  use.options = {
                    ...use.options,
                    modules: {
                      ...use.options?.modules,
                      mode: "local",
                      localIdentName: "[hash:base64:6]",
                    },
                  };
                }
              });
            }
          }
        });
      }
    }

    // Memory optimization for large builds
    config.performance = {
      ...config.performance,
      hints: false,
      maxAssetSize: 1000000,
      maxEntrypointSize: 1000000,
    };

    return config;
  },
};

export default withBundleAnalyzer(bundleAnalyzerConfig)(nextConfig);
