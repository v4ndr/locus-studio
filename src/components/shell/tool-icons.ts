import { AudioWaveform, FileHeart, MessageSquareQuote, Plug, type LucideIcon } from "lucide-react";
import type { ToolKey } from "@/i18n/routes";

/** L'icône Lucide de chaque outil du sandbox (sidebar, accueil, palette). */
export const TOOL_ICONS: Record<ToolKey, LucideIcon> = { lgcNatif: FileHeart, integration: Plug, chatbot: MessageSquareQuote, scribe: AudioWaveform };
