// La dictée du scribe ouvre un WebSocket vers le service de transcription : son origine
// n'entre dans la CSP que si la clé serveur est posée (sinon, aucun nom de service dans les en-têtes).
const stt = process.env.MISTRAL_API_KEY?.trim() ? " wss://api.mistral.ai" : "";
/**
 * Le domaine Frontend API de l'instance Clerk Studio, lu dans la clé
 * publique (`pk_live_<base64("clerk.exemple.fr$")>`). Sans clé : aucune
 * origine Clerk n'entre dans la CSP.
 */
function clerkOrigin() {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  if (!pk || !process.env.CLERK_SECRET_KEY?.trim()) return null;
  try {
    const host = Buffer.from(pk.split("_")[2] ?? "", "base64").toString("utf8").replace(/\$$/, "");
    return /^[a-z0-9.-]+$/i.test(host) ? `https://${host}` : null;
  } catch {
    return null;
  }
}
const clerk = clerkOrigin();
// Clerk : le script et l'API de l'instance, les avatars, le contrôle anti-robot (Cloudflare Turnstile)
// et le script anti-fraude de Clerk (cdn.protect.clerk.com), refusé jusqu'ici par la CSP.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${clerk ? ` ${clerk} https://challenges.cloudflare.com https://cdn.protect.clerk.com` : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${clerk ? " https://img.clerk.com" : ""}`,
  "font-src 'self' data:",
  `connect-src 'self'${stt}${clerk ? ` ${clerk} https://*.protect.clerk.com` : ""}`,
  ...(clerk ? ["frame-src https://challenges.cloudflare.com", "worker-src 'self' blob:"] : []),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

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
        // Scripts et styles inline : Next (thème avant le premier rendu, styles de composants). Seule ressource tierce : Clerk, quand ses clés sont posées.
        { key: "Content-Security-Policy", value: csp },
      ],
    }];
  },
};
export default nextConfig;
