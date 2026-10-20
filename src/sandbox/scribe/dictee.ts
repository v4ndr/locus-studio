"use client";
import * as React from "react";

/**
 * La dictée au micro (comptes invités) : un jeton éphémère demandé au
 * serveur (`/api/scribe/stt`), puis un WebSocket direct vers le service de
 * transcription en temps réel. L'audio part en PCM s16le 16 kHz mono, par
 * paquets de 100 ms ; le texte revient en deltas. Rien n'est enregistré :
 * ni l'audio, ni la transcription ne quittent la mémoire de l'onglet, hors
 * du flux de transcription lui-même.
 */

export type EtatDictee = "off" | "connexion" | "on";
export type ErreurDictee = "micro" | "stt" | null;

/** Garde-fou de coût : une dictée s'arrête d'elle-même au bout de 15 minutes. */
const DUREE_MAX_MS = 15 * 60 * 1000;

function base64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function useDictee(onTexte: (delta: string) => void) {
  const [etat, setEtat] = React.useState<EtatDictee>("off");
  const [erreur, setErreur] = React.useState<ErreurDictee>(null);
  const cb = React.useRef(onTexte);
  React.useEffect(() => { cb.current = onTexte; }, [onTexte]);
  const r = React.useRef<{ ws?: WebSocket; ctx?: AudioContext; stream?: MediaStream; prete?: boolean; minuteur?: ReturnType<typeof setTimeout> }>({});

  const couper = React.useCallback(() => {
    const x = r.current;
    if (x.minuteur) clearTimeout(x.minuteur);
    x.stream?.getTracks().forEach((t) => t.stop());
    x.ctx?.close().catch(() => {});
    const ws = x.ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify({ type: "input_audio.end" })); } catch {}
      // Laisser arriver les derniers deltas, puis fermer.
      setTimeout(() => { try { ws.close(1000); } catch {} }, 2500);
    } else if (ws) {
      try { ws.close(); } catch {}
    }
    r.current = {};
    setEtat("off");
  }, []);

  const demarrer = React.useCallback(async () => {
    if (r.current.ws || r.current.stream) return;
    setErreur(null);
    setEtat("connexion");
    let session: { url: string; token: string; delayMs?: number };
    try {
      const res = await fetch("/api/scribe/stt", { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      session = await res.json();
    } catch {
      setErreur("stt"); setEtat("off"); return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    } catch {
      setErreur("micro"); setEtat("off"); return;
    }
    const x = r.current;
    x.stream = stream;
    const ws = new WebSocket(session.url, ["realtime", session.token]);
    x.ws = ws;
    ws.onmessage = (ev) => {
      let m: { type?: string; text?: string };
      try { m = JSON.parse(typeof ev.data === "string" ? ev.data : ""); } catch { return; }
      if (m.type === "session.created") {
        ws.send(JSON.stringify({ type: "session.update", session: { audio_format: { encoding: "pcm_s16le", sample_rate: 16000 }, target_streaming_delay_ms: session.delayMs ?? 480 } }));
        x.prete = true;
        setEtat("on");
      } else if (m.type === "transcription.text.delta" && typeof m.text === "string") {
        cb.current(m.text);
      } else if (m.type === "error") {
        setErreur("stt");
        couper();
      }
    };
    ws.onerror = () => { setErreur("stt"); couper(); };
    ws.onclose = () => { if (r.current.ws === ws) couper(); };
    try {
      const ctx = new AudioContext();
      x.ctx = ctx;
      await ctx.audioWorklet.addModule("/scribe/pcm-worklet.js");
      const src = ctx.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(ctx, "pcm-capture");
      node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        if (x.prete && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "input_audio.append", audio: base64(e.data) }));
      };
      const muet = ctx.createGain();
      muet.gain.value = 0;
      src.connect(node).connect(muet).connect(ctx.destination);
    } catch {
      setErreur("micro"); couper(); return;
    }
    x.minuteur = setTimeout(couper, DUREE_MAX_MS);
  }, [couper]);

  React.useEffect(() => couper, [couper]);

  return { etat, erreur, demarrer, arreter: couper };
}
