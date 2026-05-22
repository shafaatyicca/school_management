/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack Next 16 mein default hay, is liye experimental key ki zaroorat nahi

  // Subdomains (lvh.me) ke liye security origins allow karein
  crossOrigin: "anonymous",

  // Agar aap images use kar rahay hain to unke domains yahan aayenge
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
