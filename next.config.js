/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    dangerouslyAllowSVG: true,
    domains: ["*.googleusercontent.com", "avatars.githubusercontent.com", "drive.google.com", "file.fezzle.dev"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        port: "",
        pathname: "/**",
      },

      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "/**",
      },
			{
				protocol: "https",
				hostname: "drive.google.com",
				port: "",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "file.fezzle.dev",
				port: "",
				pathname: "/**",
			}
    ],
  },
};

module.exports = nextConfig;