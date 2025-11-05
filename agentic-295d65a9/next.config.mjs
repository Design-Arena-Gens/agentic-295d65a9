/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["https://agentic-295d65a9.vercel.app"]
    }
  }
};

export default nextConfig;
