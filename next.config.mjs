/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['youtube-dl-exec'],
    outputFileTracingIncludes: {
      '/api/**/*': ['./node_modules/youtube-dl-exec/bin/**/*']
    }
  }
};

export default nextConfig;
