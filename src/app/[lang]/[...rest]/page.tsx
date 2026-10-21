import { notFound } from "next/navigation";

/** Toute URL inconnue sous `/[lang]` : la 404 dans la coque. */
export default function Page() { notFound(); }
