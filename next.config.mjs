/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    agentUpgrade: "security",
  },
  images: {
    qualities: [75, 90],
  },
};
export default nextConfig;
