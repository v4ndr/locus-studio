"use client";
import * as React from "react";

/**
 * Le fond en graphe de connaissances (identite/graph-bg.js, validé le
 * 20/10/2026) : des grappes de points reliés, monochromes et discrets. Au
 * passage du pointeur, les nœuds proches s'écartent puis reviennent avec un
 * peu d'inertie. Rien n'est redessiné au repos ; fixe si l'utilisateur
 * demande moins d'animations. Le canvas est fixe, derrière la zone
 * principale (la sidebar et les cartes restent opaques). Il relit
 * `--foreground` quand le thème change (`data-mode` sur <html>).
 */
type Node = { tx: number; ty: number; x: number; y: number; vx: number; vy: number; hub: 0 | 1 | 2 };

export function GraphBackground() {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const cv = ref.current;
    const x = cv?.getContext("2d");
    if (!cv || !x) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, N: Node[] = [], E: [number, number][] = [], fg = "#fafafa", mx = -1e4, my = -1e4, raf = 0;

    const lireFg = () => { fg = getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim() || fg; };

    function build() {
      let s = 7;
      const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
      const dpr = Math.min(2, devicePixelRatio || 1);
      W = innerWidth; H = innerHeight; cv!.width = W * dpr; cv!.height = H * dpr; x!.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Grappes : des centres répartis sur la page, chacun avec ses nœuds proches,
      // parfois une sous-grappe, et quelques ponts vers les grappes voisines.
      N = []; E = [];
      const add = (tx: number, ty: number, hub: 0 | 1 | 2) => (N.push({ tx, ty, x: tx, y: ty, vx: 0, vy: 0, hub }), N.length - 1);
      const cell = 240, hubs: number[] = [];
      for (let gy = 0; gy < H / cell + 1; gy++) for (let gx = 0; gx < W / cell + 1; gx++) {
        if (rnd() < .2) continue;
        const cx = (gx + .2 + rnd() * .6) * cell, cy = (gy + .2 + rnd() * .6) * cell, h = add(cx, cy, 2);
        hubs.push(h);
        const n = 7 + ((rnd() * 12) | 0), local = [h];
        for (let k = 0; k < n; k++) {
          const a = rnd() * 6.283, d = 26 + Math.sqrt(rnd()) * 62;
          const pIdx = d > 60 && local.length > 3 && rnd() < .5 ? local[1 + ((rnd() * (local.length - 1)) | 0)] : h;
          const P = N[pIdx], dd = pIdx === h ? d : 16 + rnd() * 22, aa = pIdx === h ? a : Math.atan2(P.ty - cy, P.tx - cx) + (rnd() - .5) * 1.6;
          const m = add(P.tx + Math.cos(aa) * dd, P.ty + Math.sin(aa) * dd, pIdx === h && k < 3 ? 1 : 0);
          E.push([pIdx, m]); local.push(m);
          if (rnd() < .18) { const o = local[1 + ((rnd() * (local.length - 1)) | 0)]; if (o !== m && Math.hypot(N[o].tx - N[m].tx, N[o].ty - N[m].ty) < 50) E.push([o, m]); }
        }
      }
      for (const h of hubs) {
        const near = hubs.filter((o) => o !== h).map((o) => [o, Math.hypot(N[o].tx - N[h].tx, N[o].ty - N[h].ty)] as const).sort((a, b) => a[1] - b[1]);
        for (const [o, d] of near.slice(0, rnd() < .5 ? 1 : 2)) if (d < cell * 1.6 && h < o) E.push([h, o]);
      }
      lireFg();
      paint();
    }

    function paint() {
      x!.clearRect(0, 0, W, H);
      x!.strokeStyle = fg; x!.lineWidth = .6; x!.globalAlpha = .14; x!.beginPath();
      for (const [a, b] of E) { x!.moveTo(N[a].x, N[a].y); x!.lineTo(N[b].x, N[b].y); }
      x!.stroke();
      x!.fillStyle = fg;
      for (const [lv, r, al] of [[0, 1.1, .32], [1, 1.5, .42], [2, 2.4, .55]] as const) {
        x!.globalAlpha = al; x!.beginPath();
        for (const n of N) if (n.hub === lv) { x!.moveTo(n.x + r, n.y); x!.arc(n.x, n.y, r, 0, 6.283); }
        x!.fill();
      }
      x!.globalAlpha = 1;
    }

    function step() {
      raf = 0; let moving = false;
      const R = 140;
      for (const n of N) {
        let ax = (n.tx - n.x) * .03, ay = (n.ty - n.y) * .03;
        const dx = n.tx - mx, dy = n.ty - my, d = Math.hypot(dx, dy);
        if (d < R && d > .01) { const f = Math.pow(1 - d / R, 2) * .45; ax += dx / d * f; ay += dy / d * f; }
        n.vx = (n.vx + ax) * .86; n.vy = (n.vy + ay) * .86; n.x += n.vx; n.y += n.vy;
        if (Math.abs(n.vx) + Math.abs(n.vy) > .01 || Math.abs(n.x - n.tx) + Math.abs(n.y - n.ty) > .05) moving = true;
      }
      paint();
      if (moving) raf = requestAnimationFrame(step);
    }

    const kick = () => { if (!raf && !still) raf = requestAnimationFrame(step); };
    const onMove = (e: PointerEvent) => { mx = e.clientX; my = e.clientY; kick(); };
    const onLeave = () => { mx = my = -1e4; kick(); };
    let rt: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => { clearTimeout(rt); rt = setTimeout(build, 150); };
    addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    addEventListener("resize", onResize);
    const obs = new MutationObserver(() => { lireFg(); paint(); });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode"] });
    build();
    return () => {
      removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      removeEventListener("resize", onResize);
      obs.disconnect();
      clearTimeout(rt);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={ref} className="graph-bg" aria-hidden="true" />;
}
