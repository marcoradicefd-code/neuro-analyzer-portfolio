// Tara il Focus sui poster di UEyes e verifica i punteggi contro lo sguardo reale.
// Uso: node tara_focus.cjs <index.html nuovo> <index.html precedente> <dati di prepara_poster.py> [--scrivi]
// Con --scrivi aggiorna la tabella FOCUS_CAL dentro index.html.
const fs = require('fs'), load = require('./app_core.cjs');
const [NEW, OLD, D] = process.argv.slice(2), WRITE = process.argv.includes('--scrivi');
const idx = JSON.parse(fs.readFileSync(D + '/indice.json')), ENG = ['classico', 'unisal', 'msinet', 'fastsal'];
const f32 = f => new Float32Array(fs.readFileSync(f).buffer.slice(0)), u8 = f => new Uint8Array(fs.readFileSync(f));
// fissazioni: float32 (poster) oppure uint8 (MIT1003)
const fixOf = (it) => { const b = fs.readFileSync(`${D}/${it.id}_fix.bin`); return b.length === it.mw * it.mh ? Float32Array.from(b) : new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)) };
const corr = (a, b) => { const n = a.length; let ma = 0, mb = 0; for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i] } ma /= n; mb /= n; let s = 0, sa = 0, sb = 0; for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; s += x * y; sa += x * x; sb += y * y } return s / Math.sqrt(sa * sb) };
const rank = a => { const o = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]), r = new Array(a.length); o.forEach(([, i], k) => r[i] = k); return r };
const spearman = (a, b) => corr(rank(a), rank(b));
const nss = (p, fix) => { const n = p.length; let m = 0; for (const v of p) m += v; m /= n; let s = 0; for (const v of p) s += (v - m) ** 2; const sd = Math.sqrt(s / n); let t = 0, w = 0; for (let i = 0; i < n; i++) if (fix[i] > 0) { t += (p[i] - m) / sd; w++ } return t / w };
const massRegion = p => { const o = Array.from(p.keys()).sort((a, b) => p[b] - p[a]), m = new Uint8Array(p.length); let c = 0; for (const i of o) { m[i] = 1; c += p[i]; if (c >= .5) break } return m };
const q = (a, t) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(t * (s.length - 1) + .5))] };
const mean = a => { const b = a.filter(Number.isFinite); return b.reduce((x, y) => x + y, 0) / b.length };
function maps(F, it) {
  const { mw, mh } = it, px = u8(`${D}/${it.id}_px.bin`), feat = F.classic(px, mw, mh, F.PLATFORMS[F.S.platform].prior), out = { classico: feat.map };
  for (const m of ENG.slice(1)) { const [ow, oh] = it[m]; out[m] = F.postMap(F.resample(f32(`${D}/${it.id}_${m}.bin`), ow, oh, mw, mh)) }
  return { feat, out };
}
function run(F, cal) {
  const res = {};
  for (const it of idx) {
    const { feat, out } = maps(F, it), hum = it.umano ? F.toProb(f32(`${D}/${it.id}_umano.bin`)) : null, fix = it.umano ? fixOf(it) : null;
    let ftot = 0; if (fix) for (const v of fix) ftot += v;
    const row = res[it.nome] = { split: it.split, umano: it.umano };
    if (hum) { row.umanoConc = F.concentration ? F.concentration(hum) : null; row.fixConc = ftot > 0 && F.concentration ? F.concentration(F.toProb(F.blur(fix, it.mw, it.mh, 3))) : NaN }
    if (hum && !(ftot > 0)) row.umano = false;
    for (const e of ENG) {
      const p = F.toProb(out[e]), hot = F.hotspots(p, it.mw, it.mh), b = F.basic({ p, hot, feat, cal: e });
      const r = row[e] = { focus: b.focus, conc: b.conc, punti: hot.length };
      if (hum) { r.cc = corr(p, hum); r.nss = nss(p, fix); const reg = massRegion(p); let inr = 0; for (let i = 0; i < p.length; i++) if (reg[i]) inr += fix[i]; r.fix50 = inr / ftot }
    }
  }
  return res;
}
// 1. tabella di taratura: 21 quantili della concentrazione sui poster, per motore
let Fn = load(NEW);
const r0 = run(Fn), posters = Object.values(r0).filter(r => r.umano);
const cal = {}; for (const e of ENG) { const c = posters.map(r => r[e].conc); cal[e] = Array.from({ length: 21 }, (_, k) => +q(c, k / 20).toFixed(4)) }
const calTrain = {}; for (const e of ENG) { const c = posters.filter(r => /train/i.test(r.split)).map(r => r[e].conc); calTrain[e] = Array.from({ length: 21 }, (_, k) => q(c, k / 20)) }
if (WRITE) { const s = fs.readFileSync(NEW, 'utf8').replace(/\/\*FOCUS_CAL\*\/[\s\S]*?\/\*FINE\*\//, `/*FOCUS_CAL*/${JSON.stringify(cal)}/*FINE*/`); fs.writeFileSync(NEW, s); Fn = load(NEW) }
// 2. verifica, prima e dopo
const Fo = load(OLD), before = run(Fo), after = run(Fn), P = k => Object.values(k).filter(r => r.umano);
console.log(`Immagini con fissazioni: ${P(after).length}. Coerenza tra le due misure umane di concentrazione: ρ = ${spearman(P(after).map(r => r.umanoConc), P(after).map(r => r.fixConc)).toFixed(2)}\n`);
console.log('motore'.padEnd(10), 'CC'.padEnd(6), 'NSS'.padEnd(6), 'fissaz. nella metà'.padEnd(20), 'ordine come le persone', ' Focus=100 prima→dopo', ' Focus IQR prima→dopo', ' punti prima→dopo');
const hc = P(after).map(r => r.umanoConc), fc = P(after).map(r => r.fixConc);
for (const e of ENG) {
  const a = P(after).map(r => r[e]), b = P(before).map(r => r[e]);
  const sat = x => (100 * x.filter(v => v.focus >= 99.5).length / x.length).toFixed(0) + '%';
  const iqr = x => `${q(x.map(v => v.focus), .25).toFixed(0)}–${q(x.map(v => v.focus), .75).toFixed(0)}`;
  console.log(e.padEnd(10), mean(a.map(v => v.cc)).toFixed(3).padEnd(6), mean(a.map(v => v.nss)).toFixed(2).padEnd(6), ((100 * mean(a.map(v => v.fix50))).toFixed(0) + '% (ideale 50%)').padEnd(20),
    ('ρ = ' + spearman(a.map(v => v.conc), hc).toFixed(2) + ' / ' + spearman(a.map(v => v.conc), fc).toFixed(2)).padEnd(23), (sat(b) + ' → ' + sat(a)).padStart(13), (iqr(b) + ' → ' + iqr(a)).padStart(20), (mean(b.map(v => v.punti)).toFixed(1) + ' → ' + mean(a.map(v => v.punti)).toFixed(1)).padStart(14));
}
// stabilità: tabella costruita sui poster di addestramento, Focus sui poster di test
const test = P(after).filter(r => /test/i.test(r.split));
if (test.length) { console.log(`\nStabilità (tabella dai poster Train, Focus sui ${test.length} poster Test, ideale mediana 50):`);
  for (const e of ENG) { const fs2 = test.map(r => { const t = calTrain[e], c = r[e].conc; if (c <= t[0]) return 0; if (c >= t[20]) return 100; for (let i = 1; i < 21; i++) if (c <= t[i]) return 100 * (i - 1 + (c - t[i - 1]) / Math.max(1e-9, t[i] - t[i - 1])) / 20 }); console.log('  ', e.padEnd(9), 'mediana', q(fs2, .5).toFixed(0), '· IQR', q(fs2, .25).toFixed(0) + '–' + q(fs2, .75).toFixed(0)) } }
for (const [nome, r] of Object.entries(after)) if (!r.umano) { console.log(`\n${nome}:`); for (const e of ENG) console.log('  ', e.padEnd(9), `Focus ${before[nome][e].focus.toFixed(0).padStart(3)} → ${r[e].focus.toFixed(0).padStart(3)} · punti ${before[nome][e].punti} → ${r[e].punti}`) }

// 3. punti di sguardo: per ogni posizione nella sequenza, quante fissazioni reali cadono nel suo cerchio rispetto al caso (area del cerchio).
//    "resa" 1 = come il caso. Serve a scegliere quando fermare la sequenza: un punto va mostrato solo se la sua resa è chiaramente sopra 1.
function ior(p, W, H, minShare) { const r = Math.max(3, Math.round(.09 * Math.max(W, H))), q = Float32Array.from(p), out = [];
  while (out.length < 6) { let bi = -1, bv = 0; for (let i = 0; i < q.length; i++) if (q[i] > bv) { bv = q[i]; bi = i }
    if (bi < 0) break; const x = bi % W, y = (bi / W) | 0, cells = []; let sh = 0;
    for (let yy = Math.max(0, y - r); yy <= Math.min(H - 1, y + r); yy++) for (let xx = Math.max(0, x - r); xx <= Math.min(W - 1, x + r); xx++) if ((xx - x) ** 2 + (yy - y) ** 2 <= r * r) { const k = yy * W + xx; sh += q[k]; q[k] = 0; cells.push(k) }
    if (sh < minShare) break; out.push({ sh, cells }) }
  return out }
console.log('\nPunti di sguardo sui poster: resa per posizione (fissazioni reali nel cerchio / area del cerchio; 1 = caso) e quota del modello nel cerchio');
for (const e of ENG.slice(1).concat(['classico'])) {
  const lift = [[], [], [], [], [], []], shr = [[], [], [], [], [], []];
  for (const it of idx.filter(i => i.umano)) { const { out } = maps(Fn, it), p = Fn.toProb(out[e]), fix = fixOf(it); let ft = 0; for (const v of fix) ft += v; if (!(ft > 0)) continue;
    ior(p, it.mw, it.mh, 0).forEach((pt, k) => { let h = 0; for (const c of pt.cells) h += fix[c]; lift[k].push((h / ft) / (pt.cells.length / p.length)); shr[k].push(pt.sh) }) }
  console.log('  ', e.padEnd(9), lift.map((l, k) => `${k + 1}°: resa ${l.length ? mean(l).toFixed(1) : '—'} (modello ${shr[k].length ? (100 * q(shr[k], .5)).toFixed(0) : '—'}%)`).join(' · '));
}
if (WRITE) console.log('\nTabella FOCUS_CAL scritta in', NEW);
