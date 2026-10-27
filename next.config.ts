import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Uploaded files and avatars are served by Supabase Storage, so its origin is
// the only third party the browser may load images/frames from or talk to.
function supabaseOrigin(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

const storage = supabaseOrigin();

const csp = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; dev mode also needs eval.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${storage}`.trim(),
  "font-src 'self'",
  `connect-src 'self' ${storage}`.trim(),
  `frame-src 'self' ${storage}`.trim(),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Material files go straight from the browser to storage; only avatars
      // (max 2 MB) pass through a Server Action.
      bodySizeLimit: "3mb",
    },
  },
  async headers() {
    return [
      {
        // The demo file route sets its own (frameable) headers.
        source: "/((?!api/demo/file).*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(isDev
            ? []
            : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
        ],
      },
    ];
  },
};

export default nextConfig;
