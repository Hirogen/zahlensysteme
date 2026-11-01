/* mathe.js – Rechen-Engine + Aufgaben-Generatoren für die 1. Mathe-Schularbeit (HTL, 1. Klasse).
   Exakte Bruchrechnung mit BigInt, Eingabe-Parser, Rechenwege im Stil des Skripts.
   Läuft im Browser (window.Mathe) und in Node (module.exports) – so ist sie testbar. */
(function (root) {
  'use strict';

  /* ======================= Exakte Brüche ======================= */
  const abs = x => (x < 0n ? -x : x);
  function gcd(a, b) { a = abs(a); b = abs(b); while (b) { [a, b] = [b, a % b]; } return a; }
  function Q(n, d) {
    n = BigInt(n); d = d === undefined ? 1n : BigInt(d);
    if (d === 0n) throw new Error('div0');
    if (d < 0n) { n = -n; d = -d; }
    const g = gcd(n, d) || 1n;
    return { n: n / g, d: d / g };
  }
  const add = (a, b) => Q(a.n * b.d + b.n * a.d, a.d * b.d);
  const sub = (a, b) => Q(a.n * b.d - b.n * a.d, a.d * b.d);
  const mul = (a, b) => Q(a.n * b.n, a.d * b.d);
  const div = (a, b) => Q(a.n * b.d, a.d * b.n);
  const neg = a => Q(-a.n, a.d);
  const eq = (a, b) => a.n === b.n && a.d === b.d;
  const isInt = a => a.d === 1n;
  const sgn = a => (a.n > 0n ? 1 : a.n < 0n ? -1 : 0);
  function pow(a, k) {
    if (Math.abs(k) > 400) throw new Error('zu groß');
    const K = BigInt(Math.abs(k));
    if (k >= 0) return Q(a.n ** K, a.d ** K);
    if (a.n === 0n) throw new Error('div0');
    return Q(a.d ** K, a.n ** K);
  }
  const p10 = k => (k >= 0 ? Q(10n ** BigInt(k)) : Q(1n, 10n ** BigInt(-k)));
  // "2,78" / "0.001" / 12 → Bruch
  function D(x) {
    if (typeof x === 'object') return x;
    const s = String(x).replace(',', '.');
    const m = s.match(/^(-?)(\d+)(?:\.(\d+))?$/);
    if (!m) throw new Error('D: ' + x);
    const f = m[3] || '';
    return Q(BigInt(m[1] + m[2] + f), 10n ** BigInt(f.length));
  }
  // Abbrechender Dezimalbruch? → { I, k } mit |q| = I·10^-k (I ohne Endnullen falls k>0)
  function decParts(q) {
    let d = q.d, k = 0;
    while (d % 10n === 0n) { d /= 10n; k++; }
    let f = 1n;
    while (d % 2n === 0n) { d /= 2n; f *= 5n; k++; }
    while (d % 5n === 0n) { d /= 5n; f *= 2n; k++; }
    if (d !== 1n) return null;
    // q = n/(q.d) ; q.d·f = 10^k
    return { I: abs(q.n) * (10n ** BigInt(k) / q.d), k };
  }
  function log10floor(q) { // nur für abbrechende Dezimalzahlen ≠ 0
    const p = decParts(q); const s = p.I.toString();
    return s.length - 1 - p.k;
  }

  /* ======================= Anzeige ======================= */
  const MINUS = '−', NB = ' ';
  const mi = s => String(s).replace(/-/g, MINUS);
  const sup = e => '<sup>' + mi(e) + '</sup>';
  const pw = (b, e) => b + sup(e);           // Potenz als HTML
  const t10 = e => pw('10', e);
  function group(intStr) { return intStr.length >= 5 ? intStr.replace(/\B(?=(\d{3})+(?!\d))/g, NB) : intStr; }
  function groupFrac(f) { return f.length >= 5 ? f.replace(/(\d{3})(?=\d)/g, '$1' + NB) : f; }
  // Festkomma-Darstellung (null, wenn nicht abbrechend)
  function fix(q) {
    const p = decParts(q); if (!p) return null;
    let s = p.I.toString();
    if (p.k > 0) { s = s.padStart(p.k + 1, '0'); s = group(s.slice(0, -p.k)) + ',' + groupFrac(s.slice(-p.k)); }
    else s = group(s);
    return (sgn(q) < 0 ? MINUS : '') + s;
  }
  // Mantisse/Exponent der normierten Gleitkommadarstellung
  function sciParts(q) {
    if (sgn(q) === 0) return { m: '0', e: 0, neg: false };
    const p = decParts(q); const s = p.I.toString().replace(/0+$/, '') || '0';
    const e = p.I.toString().length - 1 - p.k;
    return { m: s[0] + (s.length > 1 ? ',' + s.slice(1) : ''), e, neg: sgn(q) < 0 };
  }
  function sci(q) { const p = sciParts(q); return (p.neg ? MINUS : '') + p.m + '·' + t10(p.e); }
  function frac(a, b) { return '<span class="frac"><span>' + a + '</span><span>' + b + '</span></span>'; }
  // Beliebiger Bruch → schönste Darstellung
  function fmt(q) {
    if (isInt(q) && abs(q.n) < 10n ** 9n) return fix(q);
    const p = decParts(q);
    if (p) {
      const e = log10floor(q);
      if (e >= -6 && e < 9 && p.I.toString().length <= 10) return fix(q);
      return sci(q);
    }
    return (sgn(q) < 0 ? MINUS : '') + frac(abs(q.n).toString(), q.d.toString());
  }
  // Ergebnis zeigen: Festkomma und (falls sinnvoll) normiert
  function both(q) {
    const p = decParts(q);
    if (!p) return fmt(q);
    const a = fmt(q), b = sci(q);
    if (a === b || sgn(q) === 0) return a;
    const e = log10floor(q);
    if (isInt(q) && e < 6) return a;
    if (e >= 0 && e < 3 && a.length < 8) return a + ' <span class="muted">= ' + b + '</span>';
    return a + ' = ' + b;
  }
  // Text-Version (für Lösungslisten ohne HTML-Brüche)
  function rw(lines) { return '<div class="rw">' + lines.map(l => '<div>' + l + '</div>').join('') + '</div>'; }
  const note = s => ' <span class="note">' + s + '</span>';

  /* ======================= Eingabe lesen ======================= */
  const SUPMAP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+' };
  function norm(s) {
    s = String(s).trim()
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, m => '^(' + [...m].map(c => SUPMAP[c]).join('') + ')')
      .replace(/[−–—]/g, '-').replace(/[×*⋅∙•]/g, '·').replace(/[÷:]/g, '/')
      .replace(/[\[{]/g, '(').replace(/[\]}]/g, ')').replace(/[   ]/g, ' ');
    // Tausender-Leerzeichen entfernen: "100 000", "0,000 078"
    s = s.replace(/,(\d{3}(?: \d{1,3})+)(?!\d)/g, m => m.replace(/ /g, '')); // Nachkommastellen "0,000 01"
    for (let i = 0; i < 6; i++) s = s.replace(/(\d) (?=\d{3}(?!\d))/g, '$1');
    return s;
  }
  function tokenize(s) {
    const t = []; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === ' ') { i++; continue; }
      const m = s.slice(i).match(/^\d+(?:[.,]\d+)?(?:[eE][+-]?\d+)?/);
      if (m) { t.push({ k: 'n', v: m[0] }); i += m[0].length; continue; }
      if ('+-·/^()'.includes(c)) { t.push({ k: c }); i++; continue; }
      if (c === 'x' || c === 'X') { t.push({ k: '·' }); i++; continue; }
      throw new Error('Zeichen ' + c);
    }
    return t;
  }
  function numTok(v) {
    const m = v.match(/^(\d+(?:[.,]\d+)?)(?:[eE]([+-]?\d+))?$/);
    let q = D(m[1]);
    if (m[2]) q = mul(q, p10(parseInt(m[2], 10)));
    return q;
  }
  function parseNum(str) {
    const t = tokenize(norm(str)); let i = 0;
    const peek = () => t[i] && t[i].k;
    function expr() { let v = term(); while (peek() === '+' || peek() === '-') { const o = t[i++].k; const w = term(); v = o === '+' ? add(v, w) : sub(v, w); } return v; }
    function term() {
      let v = unary();
      for (;;) {
        const p = peek();
        if (p === '·' || p === '/') { i++; const w = unary(); v = p === '·' ? mul(v, w) : div(v, w); }
        else if (p === 'n' || p === '(') { v = mul(v, unary()); }
        else return v;
      }
    }
    function unary() { if (peek() === '-') { i++; return neg(unary()); } if (peek() === '+') { i++; return unary(); } return power(); }
    function power() {
      const b = primary();
      if (peek() === '^') { i++; const e = unary(); if (!isInt(e)) throw new Error('Exponent'); return pow(b, Number(e.n)); }
      return b;
    }
    function primary() {
      const x = t[i++]; if (!x) throw new Error('Ende');
      if (x.k === 'n') return numTok(x.v);
      if (x.k === '(') { const v = expr(); if (peek() !== ')') throw new Error(')'); i++; return v; }
      throw new Error('unerwartet');
    }
    const v = expr();
    if (i !== t.length) throw new Error('Rest');
    return v;
  }
  // Variablen-Ausdruck wie "a^3·x^2·y^10", "y^3/x^2", "x^-2" → { coef, ex: {x:2,…} }
  function parseMono(str) {
    let s = norm(str).replace(/\s+/g, '').replace(/·/g, '');
    if (!s) throw new Error('leer');
    const parts = s.split('/');
    if (parts.length > 2) throw new Error('zu viele /');
    const res = { coef: Q(1), ex: {} };
    parts.forEach((p, idx) => {
      if (p.startsWith('(') && p.endsWith(')')) p = p.slice(1, -1);
      const re = /([a-z])(?:\^\(?([+-]?\d+)\)?)?|(\d+(?:[.,]\d+)?)/gy;
      let m, pos = 0;
      while (pos < p.length) {
        re.lastIndex = pos; m = re.exec(p);
        if (!m || m.index !== pos) throw new Error('Zeichen');
        pos = re.lastIndex;
        const sgnI = idx === 0 ? 1 : -1;
        if (m[3]) res.coef = idx === 0 ? mul(res.coef, D(m[3])) : div(res.coef, D(m[3]));
        else { const e = m[2] === undefined ? 1 : parseInt(m[2], 10); res.ex[m[1]] = (res.ex[m[1]] || 0) + sgnI * e; }
      }
    });
    Object.keys(res.ex).forEach(k => { if (res.ex[k] === 0) delete res.ex[k]; });
    return res;
  }
  function monoEq(a, b) {
    const ka = Object.keys(a).filter(k => a[k]), kb = Object.keys(b).filter(k => b[k]);
    return ka.length === kb.length && ka.every(k => a[k] === b[k]);
  }
  function monoHTML(ex) {
    const ks = Object.keys(ex).filter(k => ex[k]).sort();
    if (!ks.length) return '1';
    const f = (k, e) => '<i>' + k + '</i>' + (e === 1 ? '' : sup(e));
    const allPos = ks.every(k => ex[k] > 0);
    const a = ks.map(k => f(k, ex[k])).join('·');
    if (allPos) return a;
    const up = ks.filter(k => ex[k] > 0).map(k => f(k, ex[k])).join('·') || '1';
    const dn = ks.filter(k => ex[k] < 0).map(k => f(k, -ex[k])).join('·');
    return a + ' = ' + frac(up, dn);
  }
  const monoPlain = ex => Object.keys(ex).filter(k => ex[k]).sort().map(k => k + (ex[k] === 1 ? '' : '^' + ex[k])).join('·') || '1';

  /* ======================= Zufall ======================= */
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const ri = (a, b, r) => a + Math.floor(r() * (b - a + 1));
  const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
  function shuffle(a, r) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const nz = (a, b, r) => { let x; do x = ri(a, b, r); while (x === 0); return x; };

  /* ======================= Terme (Kapitel 1.1) =======================
     Summe S = [{s:±1, t:Term}] · Term T = [{op:null|'·'|':', f:Faktor}]
     Faktor: N (Zahl) | G (Klammer mit Summe) | P (Potenz: Basis N/G, Exponent) */
  const N = v => ({ k: 'N', v: typeof v === 'object' ? v : Q(v) });
  const G = sum => ({ k: 'G', sum });
  const P = (b, e) => ({ k: 'P', b, e });
  const S = items => ({ k: 'S', items });
  const T = items => ({ k: 'T', items });
  const it = (s, ...fs) => ({ s, t: T(fs.map((f, j) => (f.op !== undefined && f.f ? f : { op: j ? '·' : null, f }))) });
  const negLit = a => G(S([{ s: -1, t: T([{ op: null, f: N(a) }]) }]));
  const settled = g => g.sum.items.length === 1 && g.sum.items[0].t.items.length === 1 && g.sum.items[0].t.items[0].f.k === 'N';
  const gval = g => { const x = g.sum.items[0]; return x.s < 0 ? neg(x.t.items[0].f.v) : x.t.items[0].f.v; };

  function evalSum(sum, ck) {
    let v = Q(0);
    sum.items.forEach(x => { const w = evalTerm(x.t, ck); v = x.s < 0 ? sub(v, w) : add(v, w); });
    ck(v); return v;
  }
  function evalTerm(t, ck) {
    let v = evalF(t.items[0].f, ck);
    for (let j = 1; j < t.items.length; j++) {
      const w = evalF(t.items[j].f, ck);
      if (t.items[j].op === ':') { if (sgn(w) === 0) throw new Error('div0'); v = div(v, w); if (ck.intDiv && !isInt(v)) throw new Error('nicht ganz'); }
      else v = mul(v, w);
      ck(v);
    }
    return v;
  }
  function evalF(f, ck) {
    if (f.k === 'N') return f.v;
    if (f.k === 'G') return evalSum(f.sum, ck);
    const v = pow(evalF(f.b, ck), f.e); ck(v); return v;
  }
  function height(sum) {
    let h = 0;
    sum.items.forEach(x => x.t.items.forEach(y => { const a = y.f.k === 'P' ? y.f.b : y.f; if (a.k === 'G' && !settled(a)) h = Math.max(h, 1 + height(a.sum)); }));
    return h;
  }
  const BR = [['(', ')'], ['[', ']'], ['{', '}']];
  function rSum(sum) {
    return sum.items.map((x, j) => (j === 0 ? (x.s < 0 ? MINUS : '') : (x.s < 0 ? ' ' + MINUS + ' ' : ' + ')) + rTerm(x.t)).join('');
  }
  function rTerm(t) { return t.items.map(y => (y.op ? ' ' + y.op + ' ' : '') + rF(y.f)).join(''); }
  function rN(v) { return isInt(v) ? (sgn(v) < 0 ? '(' + fix(v) + ')' : fix(v)) : '(' + fmt(v) + ')'; }
  function rF(f) {
    if (f.k === 'N') return rN(f.v);
    if (f.k === 'G') {
      if (settled(f)) return '(' + rSum(f.sum) + ')';
      const b = BR[Math.min(2, height(f.sum))];
      return b[0] + rSum(f.sum) + b[1];
    }
    return rF(f.b) + sup(f.e);
  }
  function factorVal(f) {
    if (f.k === 'N') return f.v;
    if (f.k === 'G') return gval(f);
    return pow(factorVal(f.b), f.e);
  }
  function tidy(sum) {
    sum.items.forEach(x => {
      x.t.items.forEach((y, j) => {
        const isP = y.f.k === 'P';
        const a = isP ? y.f.b : y.f;
        let v = null;
        if (a.k === 'G' && settled(a)) v = gval(a);
        else if (a.k === 'N') v = a.v;
        if (v === null) return;
        let atom;
        if (sgn(v) >= 0) atom = N(v);
        else if (j === 0 && !isP) { x.s = -x.s; atom = N(neg(v)); }
        else atom = negLit(neg(v));
        if (isP) y.f.b = atom; else y.f = atom;
      });
    });
    return sum;
  }
  function round(sum) {
    let rec = false;
    sum.items.forEach(x => x.t.items.forEach(y => {
      const a = y.f.k === 'P' ? y.f.b : y.f;
      if (a.k === 'G' && !settled(a)) { round(a.sum); rec = true; }
    }));
    if (!rec) {
      if (sum.items.some(x => x.t.items.some(y => y.f.k === 'P'))) {
        sum.items.forEach(x => x.t.items.forEach(y => { if (y.f.k === 'P') y.f = N(factorVal(y.f)); }));
      } else if (sum.items.some(x => x.t.items.length > 1)) {
        sum.items.forEach(x => {
          if (x.t.items.length < 2) return;
          let v = factorVal(x.t.items[0].f);
          for (let j = 1; j < x.t.items.length; j++) { const w = factorVal(x.t.items[j].f); v = x.t.items[j].op === ':' ? div(v, w) : mul(v, w); }
          x.t.items = [{ op: null, f: N(v) }];
        });
      } else if (sum.items.length > 1) {
        let v = Q(0);
        sum.items.forEach(x => { const w = factorVal(x.t.items[0].f); v = x.s < 0 ? sub(v, w) : add(v, w); });
        sum.items = [{ s: 1, t: T([{ op: null, f: N(v) }]) }];
      }
    }
    return tidy(sum);
  }
  const clone = o => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'bigint' ? { $b: v.toString() } : v)), (k, v) => (v && v.$b !== undefined ? BigInt(v.$b) : v));
  function steps(sum0) {
    const sum = clone(sum0); tidy(sum);
    const lines = [rSum(sum)];
    for (let g = 0; g < 40; g++) {
      const done = sum.items.length === 1 && sum.items[0].t.items.length === 1 && sum.items[0].t.items[0].f.k === 'N';
      if (done) break;
      round(sum); lines.push('= ' + rSum(sum));
    }
    return lines;
  }
  function hasDeep(sum, d) { // Klammer-Tiefe ≥ d?
    return height(sum) >= d;
  }
  // Zufälliger Rechenausdruck. lvl 1: keine Klammern · 2: Klammern · 3: Klammern in Klammern
  function genFactor(r, depth, lvl) {
    const x = r();
    if (depth > 0 && x < 0.32) {
      const g = G(genSum(r, depth - 1, false, lvl));
      return r() < 0.25 ? P(g, ri(2, 3, r)) : g;
    }
    if (x < 0.55) { const b = ri(2, 5, r); return P(N(b), b <= 3 ? ri(2, 4, r) : ri(2, 3, r)); }
    if (x < 0.7 && lvl >= 2) { const b = ri(2, 5, r); return P(negLit(b), b <= 3 ? ri(2, 4, r) : 2); }
    if (x < 0.78 && lvl >= 2) return negLit(ri(1, 9, r));
    return N(ri(2, 12, r));
  }
  function genSum(r, depth, top, lvl) {
    const n = top ? ri(2, 4, r) : 2 + (r() < 0.3 ? 1 : 0);
    const items = [];
    for (let j = 0; j < n; j++) {
      const s = j === 0 ? (r() < 0.2 ? -1 : 1) : (r() < 0.5 ? -1 : 1);
      const nf = r() < 0.55 ? 2 : (r() < 0.75 ? 1 : 3);
      const fs = [];
      for (let k = 0; k < nf; k++) {
        const div_ = k > 0 && r() < 0.3;
        let f = genFactor(r, depth, lvl);
        if (div_ && f.k === 'N') f = N(ri(2, 9, r));
        fs.push({ op: k === 0 ? null : (div_ ? ':' : '·'), f });
      }
      items.push({ s, t: T(fs) });
    }
    return S(items);
  }
  function countP(sum) { let c = 0; sum.items.forEach(x => x.t.items.forEach(y => { if (y.f.k === 'P') c++; const a = y.f.k === 'P' ? y.f.b : y.f; if (a.k === 'G') c += countP(a.sum); })); return c; }
  function hasDiv(sum) { let c = false; sum.items.forEach(x => x.t.items.forEach(y => { if (y.op === ':') c = true; const a = y.f.k === 'P' ? y.f.b : y.f; if (a.k === 'G' && hasDiv(a.sum)) c = true; })); return c; }
  function genExpr(r, lvl) {
    for (let tries = 0; tries < 5000; tries++) {
      const e = genSum(r, lvl - 1, true, lvl);
      const ck = v => { if (abs(v.n) > 6000n) throw new Error('groß'); };
      ck.intDiv = true;
      let v;
      try { v = evalSum(e, ck); } catch (err) { continue; }
      if (!isInt(v) || abs(v.n) > 2500n) continue;
      if (countP(e) < 1) continue;
      if (lvl >= 2 && height(e) < 1) continue;
      if (lvl >= 3 && height(e) < 2) continue;
      if (lvl >= 3 && !hasDiv(e) && r() < 0.6) continue;
      if (lvl === 1 && e.items.length < 3) continue;
      const len = rSum(e).replace(/<[^>]+>/g, '').length;
      if (len > (lvl === 3 ? 62 : 46) || len < 14) continue;
      return { e, v };
    }
    throw new Error('genExpr');
  }

  /* ======================= Einheiten (Kapitel 1.4) ======================= */
  const PREF = { E: 18, P: 15, T: 12, G: 9, M: 6, k: 3, h: 2, da: 1, '': 0, d: -1, c: -2, m: -3, 'μ': -6, n: -9, p: -12, f: -15, a: -18 };
  const PNAME = { E: 'Exa', P: 'Peta', T: 'Tera', G: 'Giga', M: 'Mega', k: 'Kilo', h: 'Hekto', da: 'Deka', d: 'Dezi', c: 'Zenti', m: 'Milli', 'μ': 'Mikro', n: 'Nano', p: 'Piko', f: 'Femto', a: 'Atto' };
  const ZNAME = { 18: 'Trillion', 15: 'Billiarde', 12: 'Billion', 9: 'Milliarde', 6: 'Million', 3: 'Tausend', 2: 'Hundert', 1: 'Zehn', '-1': 'Zehntel', '-2': 'Hundertstel', '-3': 'Tausendstel', '-6': 'Millionstel', '-9': 'Milliardstel', '-12': 'Billionstel', '-15': 'Billiardstel', '-18': 'Trillionstel' };
  const uh = (p, u, k) => '<span class="vs">' + p + '</span><span class="eh">' + u + '</span>' + (k > 1 ? sup(k) : '');
  const pv = p => (p === '' ? '1' : t10(PREF[p]));
  const NICE = ['1', '1,2', '1,5', '2', '2,4', '2,5', '3', '3,2', '3,6', '4', '4,5', '5', '5,6', '6', '6,4', '6,7', '7,2', '7,46', '7,8', '8', '9', '12', '15', '24', '36', '45', '56', '67', '78', '150', '320', '450', '560', '720'];
  function niceVal(r, lo, hi) { // Wert m·10^k mit 10^lo ≤ |v| < 10^hi
    for (let g = 0; g < 200; g++) {
      const m = D(pick(NICE, r)); const v = mul(m, p10(ri(lo - 2, hi, r)));
      const e = log10floor(v); if (e >= lo && e < hi) return v;
    }
    return Q(5);
  }
  function sigDigits(q) { const p = decParts(q); if (!p) return 99; return p.I.toString().replace(/0+$/, '').length; }

  /* ======================= Aufgaben-Generatoren ======================= */
  const GEN = {};
  const num = (prompt, ans, solution, extra) => Object.assign({ mode: 'num', prompt, ans, show: both(ans), solution }, extra || {});
  const choice = (prompt, choices, correct, solution, r) => {
    const order = shuffle(choices.map((c, j) => j), r);
    return { mode: 'choice', prompt, choices: order.map(j => choices[j]), correct: order.indexOf(correct), show: choices[correct], solution };
  };

  /* ---- 1.1 Rechenoperationen ---- */
  GEN.reihenfolge = (r, sp) => {
    const lvl = sp.lvl || pick([1, 2, 2, 3], r);
    const { e, v } = genExpr(r, lvl);
    const lines = steps(e);
    return num('Berechne ohne Taschenrechner:<div class="ausdruck">' + lines[0] + '</div>', v,
      rw(lines) + '<p class="hint">Reihenfolge: innerste Klammer zuerst – darin Potenzen, dann Punkt (· :) von links nach rechts, dann Strich (+ −).</p>');
  };
  GEN.vorzeichen = (r) => {
    const a = ri(2, 5, r), n = a <= 3 ? ri(2, 4, r) : ri(2, 3, r), b = ri(2, 6, r);
    const forms = [
      () => S([it(-1, P(N(a), n))]),
      () => S([it(1, P(negLit(a), n))]),
      () => S([it(-1, P(negLit(a), n))]),
      () => S([it(-1, P(N(a), n), { op: '·', f: N(b) })]),
      () => S([it(1, P(negLit(a), n), { op: '·', f: N(b) })]),
      () => S([it(-1, P(N(a), 2)), it(-1, P(negLit(b), 2))]),
      () => S([it(1, N(b)), it(-1, P(negLit(a), n))])
    ];
    const e = pick(forms, r)();
    const v = evalSum(e, () => {});
    const lines = steps(e);
    return num('Berechne:<div class="ausdruck">' + lines[0] + '</div>', v,
      rw(lines) + '<p class="hint"><b>Potenz kommt vor dem Minus:</b> −' + a + sup(2) + ' = −(' + a + '·' + a + ') = −' + a * a + ', aber (−' + a + ')' + sup(2) + ' = (−' + a + ')·(−' + a + ') = +' + a * a + '. Gerader Exponent bei negativer Basis → positiv, ungerader → negativ.</p>');
  };

  const OPS = [
    { sym: '+', n: ['Summand', 'Summand', 'Summe'], st: 1, name: 'Addition', f: (a, b) => a + b },
    { sym: MINUS, n: ['Minuend', 'Subtrahend', 'Differenz'], st: 1, name: 'Subtraktion', f: (a, b) => a - b },
    { sym: '·', n: ['Faktor', 'Faktor', 'Produkt'], st: 2, name: 'Multiplikation', f: (a, b) => a * b },
    { sym: ':', n: ['Dividend', 'Divisor', 'Quotient'], st: 2, name: 'Division', f: null },
    { sym: '^', n: ['Basis', 'Exponent', 'Potenz'], st: 3, name: 'Potenzieren', f: null },
    { sym: '√', n: ['Wurzelexponent', 'Radikand', 'Wurzel'], st: 3, name: 'Wurzelziehen', f: null }
  ];
  GEN.begriff = (r) => {
    const op = pick(OPS, r);
    if (r() < 0.25) {
      return choice('Zu welcher <b>Stufe</b> gehört die Rechenart <b>' + op.name + '</b>?', ['1. Stufe', '2. Stufe', '3. Stufe'], op.st - 1,
        '<p>1. Stufe: + −  ·  2. Stufe: · :  ·  3. Stufe: Potenzieren und Wurzelziehen. Höhere Stufe wird immer zuerst gerechnet („Punkt vor Strich“, Potenz vor Punkt).</p>', r);
    }
    let a, b, c, html;
    const mk = (i, x) => (i === pos ? '<mark>' + x + '</mark>' : x);
    const pos = ri(0, 2, r);
    if (op.sym === ':') { b = ri(2, 9, r); c = ri(2, 12, r); a = b * c; html = mk(0, a) + ' : ' + mk(1, b) + ' = ' + mk(2, c); }
    else if (op.sym === '^') { a = ri(2, 5, r); b = ri(2, 4, r); c = a ** b; html = mk(0, a) + '<sup>' + mk(1, b) + '</sup> = ' + mk(2, c); }
    else if (op.sym === '√') { b = pick([2, 3], r); c = ri(2, 6, r); a = c ** b; html = '<sup>' + mk(0, b) + '</sup>√' + mk(1, a) + ' = ' + mk(2, c); }
    else { a = ri(12, 60, r); b = ri(2, 11, r); c = op.f(a, b); html = mk(0, a) + ' ' + op.sym + ' ' + mk(1, b) + ' = ' + mk(2, c); }
    const right = op.n[pos];
    const opts = [...new Set(op.n)];
    const others = shuffle(OPS.filter(o => o !== op).flatMap(o => o.n), r).filter(x => !opts.includes(x));
    while (opts.length < 4) { const x = others.shift(); if (!opts.includes(x)) opts.push(x); }
    return choice('Wie heißt die markierte Zahl?<div class="ausdruck">' + html + '</div>', opts, opts.indexOf(right),
      '<p><b>' + op.name + ':</b> ' + op.n[0] + ' ' + (op.sym === '^' || op.sym === '√' ? '/ ' : op.sym + ' ') + op.n[1] + ' = ' + op.n[2] + '.</p>', r);
  };
  GEN.gesetz = (r) => {
    const a = ri(2, 9, r), b = ri(2, 9, r), c = ri(2, 9, r), plus = r() < 0.5, o = plus ? '+' : '·';
    const L = ['Kommutativgesetz', 'Assoziativgesetz', 'Distributivgesetz'];
    const v = [
      [a + ' ' + o + ' ' + b + ' = ' + b + ' ' + o + ' ' + a, 0],
      ['(' + a + ' ' + o + ' ' + b + ') ' + o + ' ' + c + ' = ' + a + ' ' + o + ' (' + b + ' ' + o + ' ' + c + ')', 1],
      [a + ' · (' + b + ' + ' + c + ') = ' + a + ' · ' + b + ' + ' + a + ' · ' + c, 2],
      [a + ' · ' + b + ' + ' + a + ' · ' + c + ' = ' + a + ' · (' + b + ' + ' + c + ')', 2],
      ['<i>a</i> ' + o + ' <i>b</i> = <i>b</i> ' + o + ' <i>a</i>', 0],
      ['<i>a</i> · (<i>b</i> + <i>c</i>) = <i>a</i>·<i>b</i> + <i>a</i>·<i>c</i>', 2]
    ];
    const [h, k] = pick(v, r);
    return choice('Welches Rechengesetz steht hier?<div class="ausdruck">' + h + '</div>', L, k,
      '<p><b>Kommutativ</b> = Reihenfolge vertauschen. <b>Assoziativ</b> = Klammern verschieben. <b>Distributiv</b> = ausmultiplizieren (→) bzw. herausheben (←). Gilt nur für + und ·, nicht für − und :.</p>', r);
  };
  GEN.element = (r) => {
    const x = r();
    if (x < 0.2) {
      const add_ = r() < 0.5;
      return num('Welche Zahl ist das <b>neutrale Element</b> der ' + (add_ ? 'Addition' : 'Multiplikation') + '?', Q(add_ ? 0 : 1),
        '<p>Neutral heißt: ändert nichts. ' + (add_ ? '5 + 0 = 5 → <b>0</b>.' : '5 · 1 = 5 → <b>1</b>.') + '</p>');
    }
    const a = pick([Q(nz(-12, 12, r)), Q(nz(-12, 12, r)), Q(ri(1, 5, r), ri(2, 9, r)), D(pick(['0,2', '0,5', '0,25', '2,5'], r))], r);
    if (sgn(a) === 0 || eq(a, Q(1))) return GEN.element(r);
    const addi = r() < 0.45;
    const ans = addi ? neg(a) : div(Q(1), a);
    return num('Wie lautet das <b>' + (addi ? 'additiv' : 'multiplikativ') + ' Inverse</b> von ' + fmt(a) + '?', ans,
      '<p>' + (addi ? 'Additiv invers: Summe ergibt 0 (Gegenzahl). ' + fmt(a) + ' + (' + fmt(ans) + ') = 0.' : 'Multiplikativ invers: Produkt ergibt 1 (Kehrwert). ' + fmt(a) + ' · ' + fmt(ans) + ' = 1.') + '</p>');
  };
  GEN.null = (r) => {
    const a = ri(2, 9, r);
    const v = [
      ['0 : ' + a, 0, '0 aufgeteilt auf ' + a + ' Teile ist 0.'],
      [a + ' · 0', 0, 'Mal 0 ist immer 0 (0·a = 0).'],
      [a + ' : 0', 3, 'Mal 0 ergibt immer 0 und lässt sich nicht rückgängig machen → durch 0 darf man <b>nicht</b> dividieren.'],
      [a + sup(0), 1, '<i>a</i>' + sup(0) + ' = 1 (das <i>a</i> wird gar nicht als Faktor genommen).'],
      ['0' + sup(a), 0, '0·0·… = 0.'],
      [a + sup(1), 2, '<i>a</i>' + sup(1) + ' = <i>a</i>.']
    ];
    const [h, k, why] = pick(v, r);
    return choice('Was ergibt <span class="n">' + h + '</span>?', ['0', '1', String(a), 'nicht erlaubt'], k, '<p>' + why + '</p>', r);
  };
  GEN.kopf = (r) => {
    if (r() < 0.6) {
      const tot = pick([50, 100], r), x1 = ri(11, tot - 11, r), y1 = ri(11, tot - 11, r);
      const arr = [x1, y1, tot - x1, tot - y1];
      return num('Rechne geschickt im Kopf:<div class="ausdruck">' + arr.join(' + ') + '</div>', Q(2 * tot),
        rw([arr.join(' + '), '= (' + x1 + ' + ' + (tot - x1) + ') + (' + y1 + ' + ' + (tot - y1) + ')' + note('Kommutativ- und Assoziativgesetz'), '= ' + tot + ' + ' + tot, '= ' + 2 * tot]));
    }
    const [p, q] = pick([[25, 4], [5, 2], [125, 8], [20, 5], [50, 2]], r), m = ri(3, 19, r);
    const arr = shuffle([p, m, q], r);
    return num('Rechne geschickt im Kopf:<div class="ausdruck">' + arr.join(' · ') + '</div>', Q(p * q * m),
      rw([arr.join(' · '), '= (' + p + ' · ' + q + ') · ' + m + note('Faktoren vertauschen und neu klammern'), '= ' + p * q + ' · ' + m, '= ' + p * q * m]));
  };
  GEN.distrib = (r) => {
    const x = r();
    if (x < 0.4) {
      const a = ri(3, 9, r), d = ri(1, 4, r), base = pick([100, 1000, 100], r), sgnd = r() < 0.6 ? -1 : 1, b = base + sgnd * d;
      return num('Rechne geschickt mit dem Distributivgesetz:<div class="ausdruck">' + a + ' · ' + b + '</div>', Q(a * b),
        rw([a + ' · ' + b, '= ' + a + ' · (' + base + ' ' + (sgnd < 0 ? MINUS : '+') + ' ' + d + ')', '= ' + a + ' · ' + base + ' ' + (sgnd < 0 ? MINUS : '+') + ' ' + a + ' · ' + d + note('ausmultiplizieren'), '= ' + a * base + ' ' + (sgnd < 0 ? MINUS : '+') + ' ' + a * d, '= ' + a * b]));
    }
    const a = ri(7, 49, r), b = ri(2, 8, r), c = pick([10, 100, 20], r) - b;
    return num('Rechne geschickt (herausheben):<div class="ausdruck">' + a + ' · ' + b + ' + ' + a + ' · ' + c + '</div>', Q(a * (b + c)),
      rw([a + ' · ' + b + ' + ' + a + ' · ' + c, '= ' + a + ' · (' + b + ' + ' + c + ')' + note('herausheben'), '= ' + a + ' · ' + (b + c), '= ' + a * (b + c)]));
  };
  GEN.gleichung = (r) => {
    const a = ri(2, 9, r), x = nz(-9, 12, r), b = nz(-20, 20, r), c = a * x + b;
    const bs = b < 0 ? ' ' + MINUS + ' ' + (-b) : ' + ' + b;
    return num('Löse die Gleichung:<div class="ausdruck">' + a + '<i>x</i>' + bs + ' = ' + fix(Q(c)) + '</div><span class="hint">Gib den Wert von <i>x</i> ein.</span>', Q(x),
      rw([a + '<i>x</i>' + bs + ' = ' + fix(Q(c)) + note('| + (' + fix(Q(-b)) + ')  inverses Element der Addition'), a + '<i>x</i> = ' + fix(Q(c - b)) + note('| · ' + frac(1, a) + '  inverses Element der Multiplikation'), '<i>x</i> = ' + fix(Q(x))]));
  };

  /* ---- 1.2 Potenzen ---- */
  GEN.potWert = (r) => {
    const x = ri(0, 6, r);
    if (x === 0) {
      const a = pick(['17', MINUS + '3', '(' + MINUS + '5)', '2,5', frac(2, 7), '1000'], r);
      return num('Berechne:<div class="ausdruck">' + (a.includes('frac') ? '(' + a + ')' : a.startsWith(MINUS) ? '(' + a + ')' : a) + sup(0) + '</div>', Q(1), '<p>Jede Zahl (≠ 0) hoch 0 ist 1: <i>a</i>' + sup(0) + ' = 1.</p>');
    }
    if (x === 1 || x === 2) {
      const b = pick([2, 2, 3, 4, 5, 10], r), k = b === 10 ? ri(1, 4, r) : ri(1, 3, r), ans = pow(Q(b), -k);
      return num('Berechne:<div class="ausdruck">' + pw(b, -k) + '</div>', ans,
        rw([pw(b, -k), '= (' + frac(1, b) + ')' + sup(k) + note('negativer Exponent = Kehrwert der Basis'), '= ' + frac(1, String(b ** k)), decParts(ans) ? '= ' + fix(ans) : '']));
    }
    if (x === 3) {
      const b = ri(2, 5, r), k = ri(2, 3, r), ans = pow(Q(-b), -k);
      return num('Berechne:<div class="ausdruck">(' + MINUS + b + ')' + sup(-k) + '</div>', ans,
        rw(['(' + MINUS + b + ')' + sup(-k), '= (' + MINUS + frac(1, b) + ')' + sup(k), '= ' + (k % 2 ? MINUS : '') + frac(1, String(b ** k)) + note(k % 2 ? 'ungerader Exponent → negativ' : 'gerader Exponent → positiv'), decParts(ans) ? '= ' + fix(ans) : '']));
    }
    if (x === 4) {
      const b = ri(2, 5, r), k = ri(1, 3, r), ans = neg(pow(Q(b), -k));
      return num('Berechne:<div class="ausdruck">' + MINUS + pw(b, -k) + '</div>', ans,
        rw([MINUS + pw(b, -k), '= ' + MINUS + '(' + frac(1, b) + ')' + sup(k) + note('Potenz kommt vor dem Minus!'), '= ' + MINUS + frac(1, String(b ** k)), decParts(ans) ? '= ' + fix(ans) : '']));
    }
    if (x === 5) {
      const [p, q] = pick([[1, 2], [1, 3], [2, 3], [1, 5], [3, 4], [2, 5], [1, 10]], r), k = p === 1 ? ri(1, 3, r) : ri(1, 2, r), ans = pow(Q(p, q), -k);
      return num('Berechne:<div class="ausdruck">(' + frac(p, q) + ')' + sup(-k) + '</div>', ans,
        rw(['(' + frac(p, q) + ')' + sup(-k), '= (' + frac(q, p) + ')' + sup(k) + note('Kehrwert, dann positiver Exponent'), '= ' + fmt(ans)]));
    }
    const [a, n] = pick([[9, 2], [16, 2], [25, 2], [49, 2], [81, 2], [100, 2], [144, 2], [8, 3], [27, 3], [64, 3], [125, 3], [1000, 3], [16, 4], [81, 4], [32, 5]], r);
    const root = Math.round(a ** (1 / n));
    return num('Berechne:<div class="ausdruck">' + a + '<sup>1/' + n + '</sup></div>', Q(root),
      rw([a + '<sup>1/' + n + '</sup> = ' + (n === 2 ? '' : '<sup>' + n + '</sup>') + '√' + a + note('<i>a</i><sup>1/n</sup> = n-te Wurzel'), '= ' + root + note('weil ' + root + sup(n) + ' = ' + a)]));
  };
  const VARS = ['x', 'y', 'a', 'b', 'z'];
  const vp = (v, e) => '<i>' + v + '</i>' + (e === 1 ? '' : sup(e));
  const mono = (prompt, ex, solution) => ({ mode: 'mono', prompt, ex, show: monoHTML(ex), solution, ph: 'z. B. x^5·y^-2' });
  GEN.potRegel = (r) => {
    const v = pick(VARS, r), k = ri(0, 3, r);
    const a = nz(-6, 12, r), b = nz(-6, 9, r), c = nz(-4, 8, r);
    if (k === 0) return mono('Vereinfache:<div class="ausdruck">' + vp(v, a) + ' · ' + vp(v, b) + '</div>', { [v]: a + b },
      rw([vp(v, a) + ' · ' + vp(v, b) + ' = ' + v + '<sup>' + mi(a) + ' + ' + (b < 0 ? '(' + mi(b) + ')' : b) + '</sup>' + note('gleiche Basis: Exponenten addieren'), '= ' + vp(v, a + b)]));
    if (k === 1) return mono('Vereinfache:<div class="ausdruck">' + frac(vp(v, a), vp(v, b)) + '</div>', { [v]: a - b },
      rw([frac(vp(v, a), vp(v, b)) + ' = ' + v + '<sup>' + mi(a) + ' − ' + (b < 0 ? '(' + mi(b) + ')' : b) + '</sup>' + note('dividieren: Exponenten subtrahieren'), '= ' + vp(v, a - b)]));
    if (k === 2) {
      const a2 = nz(-5, 6, r), b2 = nz(-4, 5, r);
      return mono('Vereinfache:<div class="ausdruck">(' + vp(v, a2) + ')' + sup(b2) + '</div>', { [v]: a2 * b2 },
        rw(['(' + vp(v, a2) + ')' + sup(b2) + ' = ' + v + '<sup>' + mi(a2) + '·' + (b2 < 0 ? '(' + mi(b2) + ')' : b2) + '</sup>' + note('Potenz potenzieren: Exponenten multiplizieren'), '= ' + vp(v, a2 * b2)]));
    }
    return mono('Vereinfache:<div class="ausdruck">' + vp(v, a) + ' · ' + vp(v, b) + ' · ' + vp(v, c) + '</div>', { [v]: a + b + c },
      rw(['= ' + v + '<sup>' + [a, b, c].map((e, j) => (j === 0 ? mi(e) : e < 0 ? ' − ' + -e : ' + ' + e)).join('') + '</sup>' + note('gleiche Basis: Exponenten addieren'), '= ' + vp(v, a + b + c)]));
  };
  GEN.potMix = (r) => {
    const vs = shuffle(VARS, r).slice(0, 3).sort();
    const k = ri(0, 3, r);
    if (k === 0) { // Produkt, gemischt
      const fs = shuffle(vs.flatMap(v => [[v, ri(2, 20, r)], [v, ri(2, 12, r)]]), r).slice(0, 5 + ri(0, 1, r));
      const ex = {}; fs.forEach(([v, e]) => { ex[v] = (ex[v] || 0) + e; });
      const sorted = vs.filter(v => ex[v]).map(v => fs.filter(f => f[0] === v).map(f => vp(v, f[1])).join(' · ')).join(' · ');
      return mono('Vereinfache:<div class="ausdruck">' + fs.map(f => vp(...f)).join(' · ') + '</div>', ex,
        rw(['= ' + sorted + note('nach Basis ordnen (Kommutativgesetz)'), '= ' + monoHTML(ex)]));
    }
    if (k === 1) { // Bruch wie im Skript
      const up = vs.map(v => [v, ri(2, 20, r)]), dn = shuffle(vs.map(v => [v, ri(1, 18, r)]), r);
      const ex = {}; up.forEach(([v, e]) => { ex[v] = e; }); dn.forEach(([v, e]) => { ex[v] -= e; });
      return mono('Vereinfache:<div class="ausdruck">' + frac(shuffle(up, r).map(f => vp(...f)).join('·'), dn.map(f => vp(...f)).join('·')) + '</div>', ex,
        rw(['= ' + vs.map(v => frac(vp(v, up.find(f => f[0] === v)[1]), vp(v, dn.find(f => f[0] === v)[1]))).join(' · ') + note('gleiche Basen zusammen'),
          '= ' + vs.map(v => vp(v, ex[v])).join(' · ') + note('Exponenten subtrahieren'), ex && Object.values(ex).some(e => e <= 0) ? '= ' + monoHTML(ex) : '']));
    }
    if (k === 2) { // (x^a·y^b)^n
      const [v, w] = vs, a = nz(-4, 6, r), b = nz(-4, 6, r), n = pick([-3, -2, -1, 2, 3, 4], r);
      const ex = { [v]: a * n, [w]: b * n };
      const inner = b < 0 && r() < 0.6 ? frac(vp(v, a), vp(w, -b)) : vp(v, a) + '·' + vp(w, b);
      return mono('Vereinfache:<div class="ausdruck">(' + inner + ')' + sup(n) + '</div>', ex,
        rw(['= (' + vp(v, a) + ')' + sup(n) + ' · (' + vp(w, b) + ')' + sup(n) + note('(<i>a·b</i>)' + sup('n') + ' = <i>a</i>' + sup('n') + '·<i>b</i>' + sup('n')), '= ' + monoHTML(ex) + note('Exponenten multiplizieren')]));
    }
    const [v, w] = vs, a = nz(-3, 5, r), b = nz(-3, 5, r), n = pick([2, 3, -2, -1], r), c = nz(-6, 8, r), d = nz(-6, 8, r);
    const ex = { [v]: a * n - c, [w]: b * n - d };
    return mono('Vereinfache:<div class="ausdruck">' + frac('(' + vp(v, a) + '·' + vp(w, b) + ')' + sup(n), vp(v, c) + '·' + vp(w, d)) + '</div>', ex,
      rw(['= ' + frac(vp(v, a * n) + '·' + vp(w, b * n), vp(v, c) + '·' + vp(w, d)) + note('Klammer auflösen: Exponenten · ' + mi(n)), '= ' + vp(v, a * n - c) + '·' + vp(w, b * n - d) + note('Exponenten subtrahieren'), '= ' + monoHTML(ex)]));
  };
  GEN.potLuecke = (r) => {
    const v = pick(VARS, r), k = ri(0, 2, r);
    if (k === 0) { const a = nz(-5, 9, r), b = nz(-5, 9, r); return num('Welche Zahl gehört ins Kästchen?<div class="ausdruck">' + vp(v, a) + ' · ' + v + '<sup>□</sup> = ' + vp(v, a + b) + '</div>', Q(b), '<p>Beim Multiplizieren werden Exponenten addiert: ' + mi(a) + ' + □ = ' + mi(a + b) + ' → □ = ' + mi(b) + '.</p>'); }
    if (k === 1) { const a = nz(-5, 9, r), b = nz(-5, 9, r); return num('Welche Zahl gehört ins Kästchen?<div class="ausdruck">' + frac(vp(v, a), v + '<sup>□</sup>') + ' = ' + vp(v, a - b) + '</div>', Q(b), '<p>Beim Dividieren werden Exponenten subtrahiert: ' + mi(a) + ' − □ = ' + mi(a - b) + ' → □ = ' + mi(b) + '.</p>'); }
    const a = nz(-4, 6, r), b = nz(-4, 5, r);
    return num('Welche Zahl gehört ins Kästchen?<div class="ausdruck">(' + v + '<sup>□</sup>)' + sup(b) + ' = ' + vp(v, a * b) + '</div>', Q(a), '<p>Potenz potenzieren: Exponenten multiplizieren. □ · ' + (b < 0 ? '(' + mi(b) + ')' : b) + ' = ' + mi(a * b) + ' → □ = ' + mi(a) + '.</p>');
  };
  GEN.potZahl = (r) => {
    for (let g = 0; g < 200; g++) {
      const [b, c] = pick([[2, 4], [2, 8], [3, 9], [5, 25], [2, 4]], r), kc = c === 8 ? 3 : 2;
      const p1 = nz(-5, 5, r), p2 = nz(-4, 4, r), p3 = nz(-5, 4, r), p4 = nz(-3, 5, r), n = pick([1, 2, -2, -1, 3], r);
      const inner = (p1 - p4) + kc * (p2 - p3), N_ = inner * n;
      if (Math.abs(N_) > 16 || Math.abs(N_) < 2) continue;
      const ans = pow(Q(b), N_);
      const fr = frac(pw(b, p1) + '·' + pw(c, p2), pw(c, p3) + '·' + pw(b, p4));
      const prompt = 'Berechne. Das Ergebnis darf als Potenz bleiben (z. B. ' + b + '^5).<div class="ausdruck">' + (n === 1 ? fr : '(' + fr + ')' + sup(n)) + '</div>';
      return num(prompt, ans, rw([
        '= ' + (n === 1 ? '' : '(') + pw(b, p1 - p4) + ' · ' + pw(c, p2 - p3) + (n === 1 ? '' : ')' + sup(n)) + note('gleiche Basen: Exponenten subtrahieren'),
        '= ' + (n === 1 ? '' : '(') + pw(b, p1 - p4) + ' · ' + pw(b, kc * (p2 - p3)) + (n === 1 ? '' : ')' + sup(n)) + note(c + ' = ' + pw(b, kc) + ', also ' + pw(c, p2 - p3) + ' = ' + pw(b, kc * (p2 - p3))),
        '= ' + (n === 1 ? '' : '(') + pw(b, inner) + (n === 1 ? '' : ')' + sup(n)),
        n === 1 ? '' : '= ' + pw(b, N_),
        '= ' + fmt(ans)
      ].filter(Boolean)), { show: pw(b, N_) + ' = ' + fmt(ans) });
    }
    return GEN.potZahl(r);
  };
  GEN.potWahr = (r) => {
    const a = ri(2, 3, r), b = ri(2, 3, r) + (a === 3 ? 0 : 1), c = ri(2, 3, r);
    const st = [
      ['(' + a + sup(b) + ')' + sup(c) + ' = ' + pw(a, b * c), true, 'Potenz potenzieren: Exponenten multiplizieren.'],
      ['(' + a + sup(b) + ')' + sup(c) + ' = ' + a + '<sup>(' + b + '<sup>' + c + '</sup>)</sup>', false, 'Potenzen sind <b>nicht assoziativ</b>: (2²)³ = 64, aber 2<sup>(2³)</sup> = 256.'],
      [pw(a, b) + ' = ' + pw(b, a), false, 'Potenzen sind <b>nicht kommutativ</b>: 2³ = 8, aber 3² = 9.'],
      ['<i>x</i>' + sup(b) + ' · <i>x</i>' + sup(c) + ' = <i>x</i>' + sup(b * c), false, 'Bei gleicher Basis werden die Exponenten <b>addiert</b>, nicht multipliziert.'],
      ['<i>x</i>' + sup(b) + ' · <i>x</i>' + sup(c) + ' = <i>x</i>' + sup(b + c), true, 'Gleiche Basis: Exponenten addieren.'],
      ['<i>x</i>' + sup(-1) + ' = ' + frac(1, '<i>x</i>'), true, 'Negativer Exponent = Kehrwert.'],
      ['<i>x</i>' + sup(-c) + ' = ' + MINUS + '<i>x</i>' + sup(c), false, 'Negativer Exponent heißt Kehrwert, nicht „negativ“: <i>x</i>' + sup(-c) + ' = 1/<i>x</i>' + sup(c) + '.'],
      ['<i>x</i>' + sup(0) + ' = 0', false, '<i>x</i>' + sup(0) + ' = 1.'],
      [MINUS + pw(a, 2) + ' = ' + pw(a * a, 1).replace('<sup>1</sup>', ''), false, 'Potenz kommt vor dem Minus: −' + a + '² = −' + a * a + '.'],
      ['(' + MINUS + a + ')' + sup(2) + ' = ' + a * a, true, '(−' + a + ')·(−' + a + ') = +' + a * a + '.'],
      ['(<i>x</i>·<i>y</i>)' + sup(c) + ' = <i>x</i>' + sup(c) + '·<i>y</i>' + sup(c), true, 'Jeder Faktor wird potenziert.'],
      [frac('<i>x</i>' + sup(b + c), '<i>x</i>' + sup(c)) + ' = <i>x</i>' + sup(b), true, 'Exponenten subtrahieren: ' + (b + c) + ' − ' + c + ' = ' + b + '.'],
      ['<i>a</i><sup>1/2</sup> = √<i>a</i>', true, '<i>a</i><sup>1/n</sup> ist die n-te Wurzel.'],
      ['<i>a</i><sup>1/2</sup> = ' + frac(1, '2<i>a</i>'), false, 'Bruch im Exponenten bedeutet Wurzel: <i>a</i><sup>1/2</sup> = √<i>a</i>.']
    ];
    const [h, ok, why] = pick(st, r);
    return choice('Stimmt das?<div class="ausdruck">' + h + '</div>', ['wahr', 'falsch'], ok ? 0 : 1, '<p>' + why + '</p>', () => 0.999); // feste Reihenfolge: wahr | falsch
  };

  /* ---- 1.2 Zehnerpotenzen ---- */
  function decStr(k) { return k >= 0 ? fix(p10(k)) : fix(p10(k)); } // 10 000 bzw. 0,001
  GEN.zehnerWert = (r) => {
    const k = nz(-7, 9, r);
    if (r() < 0.5) return Object.assign(num('Schreib als Dezimalzahl (ohne Zehnerpotenz):<div class="ausdruck">' + t10(k) + '</div>', p10(k),
      '<p>' + (k > 0 ? 'Positiver Exponent = Anzahl der Nullen: eine 1 mit ' + k + ' Nullen.' : 'Negativer Exponent: ' + t10(k) + ' = ' + frac(1, t10(-k)) + ' → die 1 steht an der ' + (-k) + '. Stelle nach dem Komma.') + '</p>'), { mode: 'plain', ph: 'z. B. 0,001' });
    return Object.assign(num('Welcher Exponent gehört ins Kästchen?<div class="ausdruck">' + decStr(k) + ' = 10<sup>□</sup></div>', Q(k),
      '<p>' + (k > 0 ? 'Nullen zählen: ' + k + ' Nullen → 10' + sup(k) + '.' : 'Die 1 steht an der ' + (-k) + '. Stelle nach dem Komma → 10' + sup(k) + '.') + '</p>'), { show: mi(k) });
  };
  // Faktor mit Wert 10^v und Anzeige wie im Skript
  function zFactor(r, lvl) {
    const x = r();
    if (x < 0.35) { const k = nz(-6, 7, r); return { h: decStr(k), v: k, w: decStr(k) + ' = ' + t10(k) }; }
    if (x < 0.65 || lvl < 2) { const k = nz(-12, 17, r); return { h: t10(k), v: k, w: t10(k) }; }
    if (x < 0.88) { const k = nz(-6, 4, r), p = nz(-4, 4, r); if (p === 1) return zFactor(r, lvl); return { h: decStr(k) + sup(p), v: k * p, w: '(' + t10(k) + ')' + sup(p) + ' = ' + t10(k * p) }; }
    const k = ri(1, 6, r), p = pick([1, -1, -2, 2], r);
    return { h: p === 1 ? frac(1, decStr(k)) : '(' + frac(1, decStr(k)) + ')' + sup(p), v: -k * p, w: '(' + frac(1, t10(k)) + ')' + (p === 1 ? '' : sup(p)) + ' = ' + (p === 1 ? '' : '(' + t10(-k) + ')' + sup(p) + ' = ') + t10(-k * p) };
  }
  GEN.zehner = (r, sp) => {
    const lvl = sp.lvl || pick([1, 2, 2, 3], r);
    for (let g = 0; g < 300; g++) {
      const nu = Array.from({ length: lvl === 1 ? 2 : ri(1, 2, r) }, () => zFactor(r, lvl));
      const de = lvl === 1 ? [] : Array.from({ length: ri(1, 2, r) }, () => zFactor(r, lvl));
      const n = lvl === 3 ? pick([2, 3, 4, -2, -1, -3], r) : 1;
      const sn = nu.reduce((s, f) => s + f.v, 0), sd = de.reduce((s, f) => s + f.v, 0), res = (sn - sd) * n;
      if (Math.abs(res) > 40 || (lvl === 1 && (Math.abs(res) > 9 || nu.every(f => Math.abs(f.v) < 3)))) continue;
      const H = (fs) => fs.map(f => f.h).join(' · ');
      const body = de.length ? frac(H(nu), H(de)) : H(nu);
      const expr = n === 1 ? body : '(' + body + ')' + sup(n);
      const tP = fs => fs.map(f => t10(f.v)).join(' · ');
      const lines = [];
      lines.push('= ' + (n === 1 ? '' : '(') + (de.length ? frac(tP(nu), tP(de)) : tP(nu)) + (n === 1 ? '' : ')' + sup(n)) + note('1. alles als Zehnerpotenz'));
      const conv = nu.concat(de).filter(f => f.w.includes('='));
      if (conv.length) lines.push('<span class="hint">' + conv.map(f => f.w).join(' · ') + '</span>');
      if (de.length) lines.push('= ' + (n === 1 ? '' : '(') + frac(t10(sn), t10(sd)) + (n === 1 ? '' : ')' + sup(n)) + note('2. Exponenten addieren'));
      lines.push('= ' + (n === 1 ? '' : '(') + t10(sn - sd) + (n === 1 ? '' : ')' + sup(n)) + note(de.length ? mi(sn) + ' − ' + (sd < 0 ? '(' + mi(sd) + ')' : sd) + ' = ' + mi(sn - sd) : 'Exponenten addieren'));
      if (n !== 1) lines.push('= ' + t10(res) + note('Exponenten multiplizieren'));
      if (Math.abs(res) <= 6) lines.push('= ' + fix(p10(res)));
      return num('Berechne. Gib das Ergebnis als Zehnerpotenz an (z. B. 10^-3).<div class="ausdruck">' + expr + '</div>', p10(res), rw(lines),
        { show: t10(res) + (Math.abs(res) <= 6 ? ' = ' + fix(p10(res)) : ''), ph: 'z. B. 10^-3' });
    }
    return GEN.zehner(r, sp);
  };

  /* ---- 1.3 Gleitkomma ---- */
  const MANT = ['1,2', '1,5', '2', '2,14', '2,5', '2,78', '3', '3,7', '4,1', '4,5', '5', '6,5', '7,4', '8', '9,1', '1,2345', '2,026', '3,04', '6,02', '1,08'];
  function shiftNote(q) {
    const e = log10floor(q);
    if (e === 0) return 'Komma muss um 0 Stellen verschoben werden → ' + t10(0) + '.';
    return 'Komma um ' + Math.abs(e) + ' Stelle' + (Math.abs(e) === 1 ? '' : 'n') + ' nach ' + (e > 0 ? 'links' : 'rechts') + ' schieben, bis genau eine Ziffer (≠ 0) davor steht → Exponent ' + mi(e) + '.';
  }
  GEN.normieren = (r) => {
    const m = D(pick(MANT, r)), e = nz(-8, 9, r) * (r() < 0.1 ? 0 : 1), sg = r() < 0.25 ? -1 : 1;
    const q = mul(Q(sg), mul(m, p10(e)));
    return Object.assign(num('Schreib in <b>normierter</b> Gleitkommadarstellung (± <i>m</i>·10<sup><i>e</i></sup> mit 1 ≤ <i>m</i> &lt; 10):<div class="ausdruck">' + fix(q) + '</div>', q,
      '<p>' + shiftNote(q) + '</p>' + rw([fix(q) + ' = ' + sci(q)])), { mode: 'norm', show: sci(q), ph: 'z. B. 2,14·10^-6' });
  };
  GEN.festkomma = (r) => {
    const m = D(pick(MANT, r)), e = nz(-7, 7, r), sg = r() < 0.2 ? -1 : 1;
    const q = mul(Q(sg), mul(m, p10(e)));
    return Object.assign(num('Schreib als Dezimalzahl (Festkommadarstellung):<div class="ausdruck">' + sci(q) + '</div>', q,
      '<p>Exponent ' + mi(e) + ' → Komma um ' + Math.abs(e) + ' Stellen nach ' + (e > 0 ? 'rechts (Zahl wird größer)' : 'links (Zahl wird kleiner)') + '.</p>' + rw([sci(q) + ' = ' + fix(q)])),
      { mode: 'plain', show: fix(q), ph: 'z. B. 0,00214' });
  };
  GEN.eNot = (r) => {
    const m = pick(['3,2', '9,1', '4,7', '6,02', '1,6', '2,5'], r), e = nz(-31, 23, r), sg = r() < 0.3 ? MINUS : '';
    const html = sg + m + '·' + t10(e);
    const mm = m.replace(',', '');
    const ch = [sg + m + 'E' + mi(e), sg + m + 'E' + mi(-e), sg + mm + 'E' + mi(e), sg + m + '^' + mi(e)];
    return choice('So zeigt ein Computer oder älterer TR die Zahl <span class="n">' + html + '</span> an:', ch, 0,
      '<p>„E“ (oder „e“) steht für „mal 10 hoch“: <span class="n">' + sg + m + 'E' + mi(e) + '</span> = ' + html + '. Eingabe am TR: <b>' + sg + m + '</b> dann Taste <b>×10<sup>x</sup></b> (bzw. <b>EE</b>/<b>EXP</b>) und <b>' + mi(e) + '</b>.</p>', r);
  };
  function gkNum(r, lo, hi) { // Festkommazahl mit 1–2 signifikanten Stellen
    const m = pick([1, 2, 3, 4, 5, 6, 8, 9, 12, 15, 25, 36, 41, 42, 44, 48], r);
    for (;;) { const e = ri(lo, hi, r); const q = mul(Q(m), p10(e)); const L = log10floor(q); if (L >= lo && L <= hi && (L >= 3 || L <= -3)) return { q, m, e }; }
  }
  GEN.gkMal = (r) => {
    const a = gkNum(r, -7, 7), b = gkNum(r, -7, 7), sg = r() < 0.3 ? -1 : 1;
    const qa = mul(Q(sg), a.q), res = mul(qa, b.q);
    const A = sciParts(qa), B = sciParts(b.q), mm = mul(D(A.m.replace(',', '.')), D(B.m.replace(',', '.')));
    return num('Berechne mit Gleitkommazahlen (ohne TR):<div class="ausdruck">' + fix(qa) + ' · ' + fix(b.q) + '</div>', res,
      rw([fix(qa) + ' · ' + fix(b.q), '= ' + sci(qa) + ' · ' + sci(b.q) + note('in Gleitkomma umschreiben'), '= ' + (A.neg ? MINUS : '') + A.m + ' · ' + B.m + ' · ' + t10(A.e) + ' · ' + t10(B.e) + note('Mantissen zusammen, Zehnerpotenzen zusammen'),
        '= ' + (A.neg ? MINUS : '') + fix(mm) + ' · ' + t10(A.e + B.e) + (log10floor(mm) !== 0 ? note('nicht normiert') : ''), log10floor(mm) !== 0 ? '= ' + sci(res) : '', '= ' + fix(res)].filter(Boolean)), { show: both(res) });
  };
  GEN.gkDiv = (r) => {
    for (let g = 0; g < 400; g++) {
      const n2 = r() < 0.6;
      const ms = [pick([12, 14, 36, 42, 48, 24, 8, 9, 15, 6], r), pick([2, 3, 4, 8, 5, 6], r)];
      const ds = [pick([2, 3, 4, 5, 6, 8, 12], r), pick([2, 3, 4, 5], r)];
      const mk = m => { const e = nz(-6, 5, r); return { m, e, q: mul(Q(m), p10(e)) }; };
      const nu = n2 ? ms.map(mk) : [mk(ms[0] * ms[1])], de = n2 ? ds.map(mk) : [mk(ds[0])];
      const mN = nu.reduce((s, f) => s * f.m, 1), mD = de.reduce((s, f) => s * f.m, 1);
      const mq = Q(mN, mD);
      if (!decParts(mq) || sigDigits(mq) > 3) continue;
      if (nu.concat(de).some(f => { const L = log10floor(f.q); return L > -2 && L < 3; }) && r() < 0.8) continue;
      const sg = r() < 0.3 ? -1 : 1;
      const eN = nu.reduce((s, f) => s + f.e, 0), eD = de.reduce((s, f) => s + f.e, 0);
      const res = mul(Q(sg), mul(mq, p10(eN - eD)));
      const fx = (f, j) => (j === 0 && sg < 0 ? MINUS : '') + fix(f.q);
      const H = fs => fs.map(fx).join(' · ');
      const M = fs => fs.map((f, j) => (j === 0 && sg < 0 && fs === nu ? MINUS : '') + f.m + '·' + t10(f.e)).join(' · ');
      return num('Berechne mit Gleitkommazahlen (ohne TR):<div class="ausdruck">' + frac(H(nu), de.map(f => fix(f.q)).join(' · ')) + '</div>', res,
        rw(['= ' + frac(M(nu), M(de)) + note('ganze Mantissen sind erlaubt – so lässt sich leichter kürzen'),
          '= ' + (sg < 0 ? MINUS : '') + frac(mN, mD) + ' · ' + frac(t10(eN), t10(eD)),
          '= ' + (sg < 0 ? MINUS : '') + fix(mq) + ' · ' + t10(eN - eD) + (log10floor(mq) !== 0 ? note('nicht normiert') : ''),
          '= ' + sci(res), '= ' + fix(res)]), { show: both(res) });
    }
    return GEN.gkDiv(r);
  };
  GEN.gkPot = (r) => {
    const x = ri(0, 3, r);
    const k = x === 1 ? pick([-2, -3], r) : pick([2, 3, -2], r), m = k < 0 ? pick([2, 5], r) : pick([2, 3, 5], r), e = nz(-5, 4, r);
    const base = mul(Q(m), p10(e));
    if (x === 2) { // (−0,05)²  oder −0,05^-2
      const inside = r() < 0.5;
      const res = inside ? pow(neg(base), k) : neg(pow(base, k));
      const show = inside ? '(' + MINUS + fix(base) + ')' + sup(k) : MINUS + fix(base) + sup(k);
      return num('Berechne mit Zehnerpotenzen (ohne TR):<div class="ausdruck">' + show + '</div>', res,
        rw(['= ' + (inside ? '(' + MINUS + m + '·' + t10(e) + ')' + sup(k) : MINUS + '(' + m + '·' + t10(e) + ')' + sup(k)) + (inside ? '' : note('Potenz kommt vor dem Minus!')),
          '= ' + (inside ? '(' + MINUS + m + ')' + sup(k) : MINUS + pw(m, k)) + ' · ' + t10(e * k) + note('(<i>a·b</i>)' + sup('n') + ' = <i>a</i>' + sup('n') + '·<i>b</i>' + sup('n')),
          '= ' + both(res)]), { show: both(res) });
    }
    const res = pow(base, k);
    return num('Berechne mit Zehnerpotenzen (ohne TR):<div class="ausdruck">' + fix(base) + sup(k) + '</div>', res,
      rw(['= (' + m + '·' + t10(e) + ')' + sup(k), '= ' + pw(m, k) + ' · (' + t10(e) + ')' + sup(k) + note('(<i>a·b</i>)' + sup('n') + ' = <i>a</i>' + sup('n') + '·<i>b</i>' + sup('n')),
        '= ' + fmt(pow(Q(m), k)) + ' · ' + t10(e * k) + (k < 0 ? note(pw(m, k) + ' = ' + frac(1, String(m ** -k))) : ''), '= ' + sci(res)]), { show: both(res) });
  };

  /* ---- 1.4 Einheiten ---- */
  const UNITS = {
    m: ['k', 'h', 'da', '', 'd', 'c', 'm', 'μ', 'n'], g: ['k', 'da', '', 'd', 'm', 'μ'], L: ['h', '', 'd', 'c', 'm', 'μ'],
    A: ['k', '', 'm', 'μ'], V: ['M', 'k', '', 'm', 'μ'], W: ['G', 'M', 'k', '', 'm'], Wh: ['T', 'G', 'M', 'k', ''], s: ['', 'm', 'μ', 'n'], Hz: ['G', 'M', 'k', ''], B: ['T', 'G', 'M', 'k', '']
  };
  GEN.vorsilbe = (r) => {
    const ps = ['E', 'P', 'T', 'G', 'M', 'k', 'h', 'da', 'd', 'c', 'm', 'μ', 'n', 'p', 'f', 'a'];
    const easy = ['T', 'G', 'M', 'k', 'h', 'da', 'd', 'c', 'm', 'μ', 'n', 'p'];
    const p = pick(r() < 0.75 ? easy : ps, r), e = PREF[p];
    const near = shuffle(ps.filter(x => x !== p && Math.abs(PREF[x] - e) <= 9), r).slice(0, 3);
    const kind = ri(0, 2, r);
    const why = '<p><b>' + PNAME[p] + '</b> (' + p + ') = ' + t10(e) + ' = ' + (ZNAME[e] || '') + '. ' + (Math.abs(e) >= 3 ? 'Ab Kilo/Milli geht es in 3er-Schritten: k, M, G, T, P, E bzw. m, μ, n, p, f, a.' : 'Nur h, da, d, c springen in 1er-Schritten.') + '</p>';
    if (kind === 0) return choice('Wofür steht die Vorsilbe <b>' + PNAME[p] + '</b> (Abkürzung <b>' + p + '</b>)?', [t10(e)].concat(near.map(x => t10(PREF[x]))), 0, why, r);
    if (kind === 1) return choice('Welche Vorsilbe steht für <b>' + t10(e) + '</b>?', [PNAME[p] + ' (' + p + ')'].concat(near.map(x => PNAME[x] + ' (' + x + ')')), 0, why, r);
    return Object.assign(num('Welcher Exponent gehört ins Kästchen?<div class="ausdruck">1 ' + PNAME[p] + ' (' + p + ') = 10<sup>□</sup></div>', Q(e), why), { show: mi(e) });
  };
  function convLines(v, p1, p2, u, k) {
    const e = (PREF[p1] - PREF[p2]) * k, res = mul(v, p10(e));
    const lines = [fmt(v) + ' ' + uh(p1, u, k) + ' = ? ' + uh(p2, u, k)];
    if (k === 1) lines.push('= ' + fmt(v) + ' · ' + frac('<span class="vs">' + (p1 || '1') + '</span>', '<span class="vs">' + (p2 || '1') + '</span>') + ' ' + uh(p2, u, 1) + note('Maßzahl · alte Vorsilbe : neue Vorsilbe'));
    else lines.push('= ' + fmt(v) + ' · (' + frac('<span class="vs">' + (p1 || '1') + '</span>', '<span class="vs">' + (p2 || '1') + '</span>') + ')' + sup(k) + ' ' + uh(p2, u, k) + note('die Vorsilbe wird mit-potenziert!'));
    lines.push('= ' + fmt(v) + ' · ' + (k === 1 ? '' : '(') + frac(pv(p1), pv(p2)) + (k === 1 ? '' : ')' + sup(k)) + ' ' + uh(p2, u, k));
    if (k !== 1) lines.push('= ' + fmt(v) + ' · (' + t10(PREF[p1] - PREF[p2]) + ')' + sup(k) + ' ' + uh(p2, u, k));
    lines.push('= ' + fmt(v) + ' · ' + t10(e) + ' ' + uh(p2, u, k));
    lines.push('= <b>' + both(res) + '</b> ' + uh(p2, u, k));
    return { res, lines };
  }
  GEN.umrechnen = (r) => {
    const u = pick(['m', 'm', 'g', 'L', 'A', 'V', 'W', 'Wh', 's', 'Hz', 'B'], r), ps = UNITS[u];
    let p1, p2; do { p1 = pick(ps, r); p2 = pick(ps, r); } while (p1 === p2);
    const v = niceVal(r, -4, 6);
    const { res, lines } = convLines(v, p1, p2, u, 1);
    return num('Rechne um:<div class="ausdruck">' + fmt(v) + ' ' + uh(p1, u, 1) + ' = ? ' + uh(p2, u, 1) + '</div>', res,
      rw(lines) + '<p class="hint">Kontrolle: Die neue Einheit ist ' + (PREF[p2] > PREF[p1] ? 'größer → die Zahl muss kleiner werden.' : 'kleiner → die Zahl muss größer werden.') + '</p>', { show: both(res) + ' ' + uh(p2, u, 1) });
  };
  GEN.flaeche = (r) => {
    const k = r() < 0.7 ? 2 : (r() < 0.8 ? 3 : 4), ps = k === 2 ? ['k', 'h', 'da', '', 'd', 'c', 'm', 'μ'] : ['', 'd', 'c', 'm', 'μ'];
    if (k === 2 && r() < 0.25) { // Ar / Hektar
      const pairs = [['ha', 4, 'm²', 0], ['a', 2, 'm²', 0], ['km²', 6, 'ha', 4], ['ha', 4, 'a', 2], ['m²', 0, 'a', 2], ['m²', 0, 'ha', 4]];
      const [u1, e1, u2, e2] = pick(pairs, r), v = niceVal(r, -1, 4), res = mul(v, p10(e1 - e2));
      const h = s => s.replace('²', sup(2));
      return num('Rechne um:<div class="ausdruck">' + fmt(v) + ' ' + h(u1) + ' = ? ' + h(u2) + '</div>', res,
        '<p>1 a (Ar) = 1 dam² = 100 m² (Quadrat mit 10 m Seitenlänge). 1 ha (Hektar) = 1 hm² = 10 000 m² (Quadrat mit 100 m Seitenlänge). 1 km² = 100 ha.</p>' +
        rw([fmt(v) + ' ' + h(u1) + ' = ' + fmt(v) + ' · ' + t10(e1 - e2) + ' ' + h(u2), '= <b>' + both(res) + '</b> ' + h(u2)]), { show: both(res) + ' ' + h(u2) });
    }
    let p1, p2; do { p1 = pick(ps, r); p2 = pick(ps, r); } while (p1 === p2 || Math.abs(PREF[p1] - PREF[p2]) > (k === 2 ? 9 : 6));
    const v = niceVal(r, -4, 5);
    const { res, lines } = convLines(v, p1, p2, 'm', k);
    return num('Rechne um:<div class="ausdruck">' + fmt(v) + ' ' + uh(p1, 'm', k) + ' = ? ' + uh(p2, 'm', k) + '</div>', res,
      rw(lines) + '<p class="hint">' + uh(p1, 'm', k) + ' heißt (' + uh(p1, 'm', 1) + ')' + sup(k) + ' – die Vorsilbe wird mit-potenziert.' + (k === 4 ? ' (Länge hoch 4 gibt es z. B. beim Flächenträgheitsmoment.)' : '') + '</p>', { show: both(res) + ' ' + uh(p2, 'm', k) });
  };
  const VOL = { 'm³': 0, 'dm³': -3, 'cm³': -6, 'mm³': -9, 'hL': -1, 'L': -3, 'dL': -4, 'cL': -5, 'mL': -6, 'μL': -9 };
  const volH = u => { const m = u.match(/^(h|d|c|m|μ)?(L|m³)$/); return u.endsWith('³') ? uh(u.length > 2 ? u[0] : '', 'm', 3) : uh(m[1] || '', 'L', 1); };
  GEN.volumen = (r) => {
    const us = Object.keys(VOL); let u1, u2;
    do { u1 = pick(us, r); u2 = pick(us, r); } while (u1 === u2 || (u1.endsWith('L') === u2.endsWith('L') && r() < 0.7) || Math.abs(VOL[u1] - VOL[u2]) > 9);
    const v = niceVal(r, -3, 5), e = VOL[u1] - VOL[u2], res = mul(v, p10(e));
    const asM = u => (u.endsWith('L') ? (u === 'L' ? '1 L = 1 dm³' : '1 ' + u + ' = ' + t10(PREF[u.slice(0, -1)]) + ' L = ' + t10(PREF[u.slice(0, -1)]) + ' dm³') : '');
    const hints = [asM(u1), asM(u2)].filter(Boolean).map(s => s.replace(/³/g, sup(3)));
    return num('Rechne um:<div class="ausdruck">' + fmt(v) + ' ' + volH(u1) + ' = ? ' + volH(u2) + '</div>', res,
      '<p><b>1 L = 1 dm³</b> · 1 mL = 1 cm³ · 1 μL = 1 mm³ · 1 m³ = 1000 L.' + (hints.length ? ' Hier: ' + hints.join('; ') + '.' : '') + '</p>' +
      rw(['In m' + sup(3) + ': 1 ' + volH(u1) + ' = ' + t10(VOL[u1]) + ' m' + sup(3) + ', 1 ' + volH(u2) + ' = ' + t10(VOL[u2]) + ' m' + sup(3),
        fmt(v) + ' · ' + frac(t10(VOL[u1]), t10(VOL[u2])) + ' = ' + fmt(v) + ' · ' + t10(e), '= <b>' + both(res) + '</b> ' + volH(u2)]), { show: both(res) + ' ' + volH(u2) });
  };
  const TIME = { d: Q(86400), h: Q(3600), min: Q(60), s: Q(1), ms: Q(1, 1000), 'μs': Q(1, 1000000) };
  const TNOTE = '1 min = 60 s · 1 h = 60 min = 3600 s · 1 d = 24 h = 1440 min = 86 400 s';
  GEN.zeit = (r) => {
    for (let g = 0; g < 400; g++) {
      const us = Object.keys(TIME); const u1 = pick(us, r), u2 = pick(us, r);
      if (u1 === u2 || (TIME[u1].d !== 1n && TIME[u2].d !== 1n)) continue;
      const v = niceVal(r, -1, 4), f = div(TIME[u1], TIME[u2]), res = mul(v, f);
      if (!decParts(res) || sigDigits(res) > 5) continue;
      return num('Rechne um:<div class="ausdruck">' + fmt(v) + ' ' + u1 + ' = ? ' + u2 + '</div>', res,
        '<p>Zeit ist nicht dezimal! ' + TNOTE + '. Nur s, ms, μs, ns gehen in Zehnerpotenzen.</p>' +
        rw(['1 ' + u1 + ' = ' + fmt(TIME[u1]) + ' s, 1 ' + u2 + ' = ' + fmt(TIME[u2]) + ' s', fmt(v) + ' ' + u1 + ' = ' + fmt(v) + ' · ' + frac(fmt(TIME[u1]), fmt(TIME[u2])) + ' ' + u2, '= <b>' + both(res) + '</b> ' + u2]), { show: both(res) + ' ' + u2 });
    }
    return GEN.zeit(r);
  };
  GEN.speed = (r) => {
    if (r() < 0.5) {
      const ms = pick([5, 10, 15, 20, 25, 30, 35, 40, 50, 100, 2.5, 12.5], r), kmh = ms * 3.6;
      const vk = D(String(kmh)), vm = D(String(ms));
      return num('Rechne um:<div class="ausdruck">' + fmt(vk) + ' ' + frac('km', 'h') + ' = ? ' + frac('m', 's') + '</div>', vm,
        rw([fmt(vk) + ' ' + frac(t10(3) + ' m', '3600 s') + ' = ' + fmt(vk) + ' · ' + frac(1, '3,6') + ' ' + frac('m', 's') + note('1 km/h = 1000 m : 3600 s'), '= ' + fmt(vk) + ' : 3,6 = <b>' + fmt(vm) + '</b> ' + frac('m', 's')]), { show: fmt(vm) + ' m/s' });
    }
    const ms = pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 100, 340, 2.5], r), vm = D(String(ms)), vk = mul(vm, D('3,6'));
    return num('Rechne um:<div class="ausdruck">' + fmt(vm) + ' ' + frac('m', 's') + ' = ? ' + frac('km', 'h') + '</div>', vk,
      rw([fmt(vm) + ' ' + frac('m', 's') + ' = ' + fmt(vm) + ' · 3,6 ' + frac('km', 'h') + note('1 m/s = 3,6 km/h'), '= <b>' + fmt(vk) + '</b> ' + frac('km', 'h')]), { show: fmt(vk) + ' km/h' });
  };
  GEN.zusammen = (r) => {
    const TOP = [
      { u: 'L', ps: ['', 'm', 'μ', 'h'], h: p => uh(p, 'L', 1), f: p => mul(p10(PREF[p]), p10(-3)) },
      { u: 'm³', ps: ['', 'd', 'c', 'm'], h: p => uh(p, 'm', 3), f: p => p10(3 * PREF[p]) },
      { u: 'V', ps: ['k', '', 'm', 'μ'], h: p => uh(p, 'V', 1), f: p => p10(PREF[p]) },
      { u: 'm', ps: ['k', '', 'c', 'm'], h: p => uh(p, 'm', 1), f: p => p10(PREF[p]) },
      { u: 'g', ps: ['k', '', 'm'], h: p => uh(p, 'g', 1), f: p => p10(PREF[p]) }
    ];
    const BOT = { s: Q(1), ms: Q(1, 1000), 'μs': Q(1, 1000000), min: Q(60), h: Q(3600) };
    for (let g = 0; g < 500; g++) {
      const t = pick(TOP, r);
      let a1, a2, b1, b2;
      if (t.u === 'L' || t.u === 'm³') { const all = TOP[0].ps.map(p => [0, p]).concat(TOP[1].ps.map(p => [1, p])); [a1, a2] = [pick(all, r), pick(all, r)]; }
      else { a1 = [TOP.indexOf(t), pick(t.ps, r)]; a2 = [TOP.indexOf(t), pick(t.ps, r)]; }
      [b1, b2] = pick([['s', 's'], ['min', 'min'], ['h', 'h'], ['ms', 'μs'], ['μs', 'ms'], ['ms', 's'], ['s', 'ms'], ['min', 's'], ['h', 's'], ['h', 'min'], ['s', 'min']], r);
      if (a1[0] === a2[0] && a1[1] === a2[1] && b1 === b2) continue;
      if (a1[0] === a2[0] && a1[1] === a2[1] || b1 === b2) { if (r() < 0.6) continue; }
      const T1 = TOP[a1[0]], T2 = TOP[a2[0]];
      const fTop = div(T1.f(a1[1]), T2.f(a2[1])), fBot = div(BOT[b1], BOT[b2]), f = div(fTop, fBot);
      const v = niceVal(r, -1, 4), res = mul(v, f);
      if (!decParts(res) || sigDigits(res) > 4) continue;
      const lhs = frac(T1.h(a1[1]), b1), rhs = frac(T2.h(a2[1]), b2);
      return num('Rechne um:<div class="ausdruck">' + fmt(v) + ' ' + lhs + ' = ? ' + rhs + '</div>', res,
        '<p>Zähler und Nenner <b>getrennt</b> umrechnen, dann zusammenfassen.' + (T1 !== T2 ? ' Dabei: 1 L = 1 dm³.' : '') + '</p>' +
        rw(['Zähler: 1 ' + T1.h(a1[1]) + ' = ' + both(fTop) + ' ' + T2.h(a2[1]), 'Nenner: 1 ' + b1 + ' = ' + both(fBot) + ' ' + b2,
          fmt(v) + ' · ' + frac(fmt(fTop), fmt(fBot)) + ' = ' + fmt(v) + ' · ' + fmt(f), '= <b>' + both(res) + '</b> ' + rhs]), { show: both(res) + ' ' + rhs });
    }
    return GEN.zusammen(r);
  };

  /* ======================= API ======================= */
  function make(spec, r) { const t = GEN[spec.kind](r, spec); t.kind = spec.kind; if (t.mode !== 'choice' && !t.ph) t.ph = 'Antwort'; return t; }
  const NORMRE = /^-?[1-9](?:[.,]\d+)?(?:·10\^\(?[+-]?\d+\)?|[eE][+-]?\d+)?$/;
  function check(task, input) {
    if (task.mode === 'choice') return { ok: Number(input) === task.correct };
    const raw = String(input == null ? '' : input).trim();
    if (!raw) return { invalid: true, msg: 'Bitte zuerst eine Antwort eingeben.' };
    if (task.mode === 'mono') {
      let m; try { m = parseMono(raw); } catch (e) { return { invalid: true, msg: 'Das kann ich nicht lesen. Schreib z. B. <b>x^5·y^-2</b> oder <b>y^3/x^2</b>.' }; }
      if (!eq(m.coef, Q(1))) return { ok: false };
      return { ok: monoEq(m.ex, task.ex) };
    }
    let v; try { v = parseNum(raw); } catch (e) { return { invalid: true, msg: 'Das kann ich nicht lesen. Beispiele: <b>-12</b> · <b>0,0028</b> · <b>2,8·10^-3</b> · <b>3/4</b> · <b>10^-3</b>' }; }
    const ok = eq(v, task.ans);
    if (!ok) return { ok: false };
    if (task.mode === 'plain' && /[\^eE⁰¹²³⁴⁵⁶⁷⁸⁹/]/.test(raw)) return { invalid: true, msg: 'Der Wert stimmt – aber bitte als <b>Dezimalzahl ohne Zehnerpotenz</b> schreiben (z. B. 0,00214).' };
    if (task.mode === 'norm') {
      const s = norm(raw).replace(/\s+/g, '').replace(/^\+/, '');
      if (!NORMRE.test(s)) return { invalid: true, msg: 'Der Wert stimmt – aber noch nicht <b>normiert</b>: vor dem ·10^ muss genau eine Ziffer von 1 bis 9 stehen (1 ≤ m &lt; 10).' };
    }
    return { ok: true };
  }

  const api = { Q, D, add, sub, mul, div, pow, eq, p10, fix, fmt, sci, both, parseNum, parseMono, monoEq, rng, make, check, GEN, PREF, PNAME, ZNAME, steps, genExpr, rSum, uh, t10, frac, decParts };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Mathe = api;
})(typeof window !== 'undefined' ? window : globalThis);
