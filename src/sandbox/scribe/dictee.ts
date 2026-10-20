"use client";
import * as React from "react";

/**
 * La dictée au micro (comptes invités) : un jeton éphémère demandé au
 * serveur (`/api/scribe/stt`), puis un WebSocket direct vers le service de
 * transcription en temps réel. L'audio part en PCM s16le 16 kHz mono, par
 * paquets de 100 ms ; le texte revient en deltas. Rien n'est enregistré :
 * ni l'audio, ni la transcription ne quittent la mémoire de l'onglet, hors
 * du flux de transcription lui-même.
 *
 * Le serveur accorde la dictée par blocs (quota de minutes par compte) : à
 * la fin d'un bloc, une nouvelle session s'ouvre avec un nouveau jeton et
 * prend le relais de l'ancienne dès qu'elle est prête, sans couper le micro.
 */

export type EtatDictee = "off" | "connexion" | "on";
export type ErreurDictee = "micro" | "stt" | "quota" | null;

/** Garde-fou de coût : une dictée s'arrête d'elle-même au bout de 15 minutes. */
const DUREE_MAX_MS = 15 * 60 * 1000;

type Session = { url: string; token: string; delayMs?: number; blocS?: number };

function base64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Un jeton de session, ou la raison du refus. */
async function demanderSession(): Promise<Session | "quota" | "stt"> {
  try {
    const res = await fetch("/api/scribe/stt", { method: "POST", cache: "no-store" });
    if (res.status === 429) return "quota";
    if (!res.ok) return "stt";
    const s = (await res.json()) as Session;
    return s.url && s.token ? s : "stt";
  } catch {
    return "stt";
  }
}

/**
 * Ferme une session que nous arrêtons : fin d'audio, puis on laisse arriver
 * les derniers deltas. Sa fermeture n'est alors plus une coupure.
 */
function clore(ws: WebSocket) {
  ws.onerror = null;
  ws.onclose = null;
  if (ws.readyState === WebSocket.OPEN) {
    try { ws.send(JSON.stringify({ type: "input_audio.end" })); } catch {}
    setTimeout(() => { try { ws.close(1000); } catch {} }, 2500);
  } else {
    try { ws.close(); } catch {}
  }
}

type Dictee = {
  /** La session qui reçoit l'audio (prête). */
  ws?: WebSocket;
  /** Les sessions ouvertes, prêtes ou non : toutes fermées à l'arrêt. */
  sockets: Set<WebSocket>;
  ctx?: AudioContext;
  stream?: MediaStream;
  debut: number;
  minuteurs: ReturnType<typeof setTimeout>[];
};

export function useDictee(onTexte: (delta: string) => void) {
  const [etat, setEtat] = React.useState<EtatDictee>("off");
  const [erreur, setErreur] = React.useState<ErreurDictee>(null);
  const cb = React.useRef(onTexte);
  React.useEffect(() => { cb.current = onTexte; }, [onTexte]);
  /** La dictée en cours ; `null` quand il n'y en a pas (ou qu'elle a été arrêtée pendant une attente). */
  const r = React.useRef<Dictee | null>(null);

  const couper = React.useCallback((motif?: ErreurDictee) => {
    const x = r.current;
    r.current = null;
    if (x) {
      x.minuteurs.forEach(clearTimeout);
      x.stream?.getTracks().forEach((t) => t.stop());
      x.ctx?.close().catch(() => {});
      x.sockets.forEach(clore);
      x.sockets.clear();
    }
    if (motif) setErreur(motif);
    setEtat("off");
  }, []);

  /**
   * Ouvre une session de transcription. Prête, elle reçoit l'audio et
   * l'éventuelle session précédente est close. À la fin du bloc accordé par
   * le serveur, une nouvelle session est demandée pour prendre le relais.
   */
  const ouvrir = React.useCallback(function ouvrir(x: Dictee, s: Session) {
    const ws = new WebSocket(s.url, ["realtime", s.token]);
    x.sockets.add(ws);
    ws.onmessage = (ev) => {
      let m: { type?: string; text?: string };
      try { m = JSON.parse(typeof ev.data === "string" ? ev.data : ""); } catch { return; }
      if (m.type === "session.created") {
        if (r.current !== x) return;
        ws.send(JSON.stringify({ type: "session.update", session: { audio_format: { encoding: "pcm_s16le", sample_rate: 16000 }, target_streaming_delay_ms: s.delayMs ?? 480 } }));
        const ancienne = x.ws;
        x.ws = ws;
        if (ancienne) { x.sockets.delete(ancienne); clore(ancienne); }
        setEtat("on");
        // Relais 10 s avant la fin du bloc, tant que la durée maximale n'est pas atteinte.
        const dans = (s.blocS ?? 0) * 1000 - 10_000;
        if (dans > 0 && Date.now() - x.debut + dans < DUREE_MAX_MS) {
          x.minuteurs.push(setTimeout(async () => {
            if (r.current !== x) return;
            const suite = await demanderSession();
            if (r.current !== x) return;
            if (typeof suite === "string") couper(suite);
            else ouvrir(x, suite);
          }, dans));
        }
      } else if (m.type === "transcription.text.delta" && typeof m.text === "string") {
        cb.current(m.text);
      } else if (m.type === "error") {
        if (r.current === x) couper("stt");
      }
    };
    // Une erreur ou une fermeture que nous n'avons pas demandée (réseau, serveur) est une coupure.
    ws.onerror = () => { if (r.current === x) couper("stt"); };
    ws.onclose = () => { if (r.current === x) couper("stt"); };
  }, [couper]);

  const demarrer = React.useCallback(async () => {
    if (r.current) return;
    const x: Dictee = { sockets: new Set(), debut: Date.now(), minuteurs: [] };
    r.current = x;
    setErreur(null);
    setEtat("connexion");
    const s = await demanderSession();
    if (r.current !== x) return; // arrêtée pendant l'attente
    if (typeof s === "string") { couper(s); return; }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    } catch {
      if (r.current === x) couper("micro");
      return;
    }
    if (r.current !== x) { stream.getTracks().forEach((t) => t.stop()); return; }
    x.stream = stream;
    x.debut = Date.now();
    try {
      const ctx = new AudioContext();
      x.ctx = ctx;
      await ctx.audioWorklet.addModule("/scribe/pcm-worklet.js");
      if (r.current !== x) return;
      const src = ctx.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(ctx, "pcm-capture");
      node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        const ws = x.ws;
        if (r.current === x && ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "input_audio.append", audio: base64(e.data) }));
      };
      const muet = ctx.createGain();
      muet.gain.value = 0;
      src.connect(node).connect(muet).connect(ctx.destination);
    } catch {
      if (r.current === x) couper("micro");
      return;
    }
    // Micro débranché ou autorisation retirée en cours de dictée.
    stream.getAudioTracks()[0]?.addEventListener("ended", () => { if (r.current === x) couper("micro"); });
    x.minuteurs.push(setTimeout(() => { if (r.current === x) couper(); }, DUREE_MAX_MS));
    ouvrir(x, s);
  }, [couper, ouvrir]);

  React.useEffect(() => () => couper(), [couper]);

  const arreter = React.useCallback(() => couper(), [couper]);
  return { etat, erreur, demarrer, arreter };
}
