import { buildWorld } from "@/fil/world.server";
import { FilApp } from "@/components/fil/fil-app";

export const dynamic = "force-static";

/**
 * L'écran unique : le fil, le composer (⌘K), la scène. Il n'y a plus de
 * pages. Les anciens écrans restent en « vues héritées » (/journee, /inbox…).
 */
export default function Page() {
  return <FilApp world={buildWorld()} />;
}
