/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['youtube-dl-exec'],
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/youtube-dl-exec/bin/**/*']
  }
};

export default nextConfig;
