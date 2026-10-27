import { AudioWaveform, FileHeart, MessageSquareQuote, Plug, type LucideIcon } from "lucide-react";
import type { ToolKey } from "@/i18n/routes";

/** L'icône Lucide de chaque outil du sandbox (sidebar, accueil, palette). */
export const TOOL_ICONS: Record<ToolKey, LucideIcon> = { lgcNatif: FileHeart, integration: Plug, chatbot: MessageSquareQuote, scribe: AudioWaveform };

/** Le LGC natif IA est servi par Locus Open, qui n'a pas de retour vers le Studio : il s'ouvre dans un nouvel onglet. */
export function cibleOutil(k: ToolKey): { target?: "_blank"; rel?: string } {
  return k === "lgcNatif" ? { target: "_blank", rel: "noopener" } : {};
}
