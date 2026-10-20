/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  poweredByHeader: false,
  // L'index du RAG simple du chatbot, lu depuis le disque par la route (s'il est dans le dépôt).
  outputFileTracingIncludes: { "/api/chatbot/rag": ["./src/data/chatbot/*.json"] },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        // Scripts et styles inline : Next (thème avant le premier rendu, styles de composants). Aucune ressource tierce.
        { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
      ],
    }];
  },
};
export default nextConfig;
