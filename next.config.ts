import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: process.env.PAGES_BASE_PATH,
  images: {
    unoptimized: true,
  },
  /* config options here */
  webpack: (config) => {
    config.module.rules.push(
      {
        test: /\.(glsl|vs|fs|vert|frag)$/,
        use: ['raw-loader'],
      },
      {
        test: /\.(gltf|glb)$/,
        type: "asset/resource",
      },
    )
    return config;
  },
  turbopack: {
    rules: {
      '*.{glsl,vs,fs,vert,frag}': {
        loaders: ['raw-loader'],
        as: '*.js',
      },
      "*.{gltf|glb}": {
        loaders: ["file"],
      },
    },
  },
};

export default nextConfig;
