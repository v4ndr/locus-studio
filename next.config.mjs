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
// Clerk : le script et l'API de l'instance, les avatars, et le contrôle anti-robot (Cloudflare Turnstile).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${clerk ? ` ${clerk} https://challenges.cloudflare.com` : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${clerk ? " https://img.clerk.com" : ""}`,
  "font-src 'self' data:",
  `connect-src 'self' wss://api.mistral.ai${clerk ? ` ${clerk}` : ""}`,
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
        // connect-src : la dictée du scribe ouvre un WebSocket vers le service de transcription en temps réel (jeton éphémère).
        { key: "Content-Security-Policy", value: csp },
      ],
    }];
  },
};
export default nextConfig;
