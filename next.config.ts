// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
// };

// export default nextConfig;



// import type { NextConfig } from "next";

// const maxFileSizeMb = Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ?? 50);
// const bodySize = Number.isFinite(maxFileSizeMb) ? maxFileSizeMb * 1024 * 1024 : 50 * 1024 * 1024;

// const nextConfig: NextConfig = {
//   experimental: {
//     middlewareClientMaxBodySize: bodySize, // عدد البايتات
//   },
//   // proxyClientMaxBodySize: bodySize, // لو مش متأكد ممكن تشيله
// };

// export default nextConfig;



import type { NextConfig } from "next";

const maxFileSizeMb = Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ?? 50);
const bodySize = Number.isFinite(maxFileSizeMb) ? maxFileSizeMb * 1024 * 1024 : 50 * 1024 * 1024;

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: bodySize,
  },
};

export default nextConfig;
