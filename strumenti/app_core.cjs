// Esegue lo script di index.html in Node con un DOM finto e restituisce le funzioni di calcolo dell'app.
const fs = require('fs'), vm = require('vm');
module.exports = function load(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  let js = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>')).trim();
  js = js.replace(/^\(\(\)=>\{/, '').replace(/\}\)\(\);\s*$/, '');
  const stub = new Proxy(function () {}, {
    get: (t, k) => k === Symbol.iterator ? function* () {} : k === Symbol.toPrimitive ? () => 0 : k === 'length' ? 0 : stub,
    apply: () => stub, construct: () => stub, set: () => true });
  const ctx = { document: stub, window: stub, navigator: stub, localStorage: stub, indexedDB: undefined, caches: undefined, fetch: () => new Promise(() => {}),
    ResizeObserver: function () { return stub }, MutationObserver: function () { return stub }, requestAnimationFrame: () => 0, performance, setTimeout: () => 0, clearTimeout: () => 0,
    console, Math, Float32Array, Uint8Array, Uint8ClampedArray, Array, Object, JSON, Promise, Number, String, Date, Map, Set, Error, isNaN, isFinite, parseInt, parseFloat, Symbol, Infinity, NaN };
  ctx.globalThis = ctx;
  const expose = `globalThis.__F=()=>({classic,prior,toProb,hotspots,basic,concentration:typeof concentration==="function"?concentration:undefined,blur,norm01,maxOf,postMap,resample,PLATFORMS,S});`;
  vm.createContext(ctx);
  try { vm.runInContext(expose + js, ctx, { timeout: 5000 }) } catch (e) { ctx.__err = e.message }
  const F = ctx.__F(); F.err = ctx.__err; return F;
};
