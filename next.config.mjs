/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  experimental: {
    // Keep server-only secrets (Gemini key, DB) off the client bundle.
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
