/*
 * Capture micro du scribe : Float32 à la fréquence du contexte audio, vers
 * PCM s16le 16 kHz mono, par paquets d'environ 100 ms envoyés au thread
 * principal. Servi depuis l'origine (CSP script-src 'self').
 */
class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000;
    this.pos = 0;
    this.buf = new Int16Array(1600);
    this.n = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    // Décimation par moyenne : suffisant pour la voix, sans dépendance.
    while (this.pos < ch.length) {
      const a = Math.floor(this.pos), b = Math.min(ch.length, Math.floor(this.pos + this.ratio));
      let s = 0, k = 0;
      for (let i = a; i < Math.max(b, a + 1); i++) { s += ch[i]; k++; }
      const v = Math.max(-1, Math.min(1, s / k));
      this.buf[this.n++] = v < 0 ? v * 0x8000 : v * 0x7fff;
      if (this.n === this.buf.length) {
        this.port.postMessage(this.buf.buffer, [this.buf.buffer]);
        this.buf = new Int16Array(1600);
        this.n = 0;
      }
      this.pos += this.ratio;
    }
    this.pos -= ch.length;
    return true;
  }
}
registerProcessor("pcm-capture", PcmCapture);
