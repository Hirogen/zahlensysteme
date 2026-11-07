/* terme.js – Rechen-Engine + Aufgaben-Generatoren für die 1. Mathe-Schularbeit (AHS, 4. Klasse).
   Reelle Zahlen (Wurzeln, Zahlenmengen, Intervalle) und Terme (Polynome, Potenzen, binomische Formeln).
   Exakt: Brüche mit BigInt, Wurzeln als a·√r (r quadratfrei), Polynome in beliebig vielen Variablen.
   Läuft im Browser (window.Terme) und in Node (module.exports) – so ist sie testbar. */
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
  const ZERO = Q(0), ONE = Q(1);
  const qadd = (a, b) => Q(a.n * b.d + b.n * a.d, a.d * b.d);
  const qsub = (a, b) => Q(a.n * b.d - b.n * a.d, a.d * b.d);
  const qmul = (a, b) => Q(a.n * b.n, a.d * b.d);
  const qdiv = (a, b) => Q(a.n * b.d, a.d * b.n);
  const qneg = a => Q(-a.n, a.d);
  const qeq = (a, b) => a.n === b.n && a.d === b.d;
  const qcmp = (a, b) => { const x = a.n * b.d - b.n * a.d; return x > 0n ? 1 : x < 0n ? -1 : 0; };
  const isInt = a => a.d === 1n;
  const qsgn = a => (a.n > 0n ? 1 : a.n < 0n ? -1 : 0);
  function qpow(a, k) {
    if (Math.abs(k) > 60) throw new Error('zu groß');
    const K = BigInt(Math.abs(k));
    if (k >= 0) return Q(a.n ** K, a.d ** K);
    if (a.n === 0n) throw new Error('div0');
    return Q(a.d ** K, a.n ** K);
  }
  function D(x) { // "2,5" → Bruch
    if (typeof x === 'object') return x;
    const s = String(x).replace(',', '.');
    const m = s.match(/^(-?)(\d+)(?:\.(\d+))?$/);
    if (!m) throw new Error('D: ' + x);
    const f = m[3] || '';
    return Q(BigInt(m[1] + m[2] + f), 10n ** BigInt(f.length));
  }
  function decStr(q, maxk) { // abbrechende Dezimalzahl als "0,25" (oder null)
    let d = q.d, k = 0;
    while (d % 2n === 0n) { d /= 2n; k++; }
    let k5 = 0; while (d % 5n === 0n) { d /= 5n; k5++; }
    if (d !== 1n) return null;
    k = Math.max(k, k5);
    if (k > (maxk === undefined ? 4 : maxk)) return null;
    const I = abs(q.n) * (10n ** BigInt(k) / q.d);
    let s = I.toString();
    if (k > 0) { s = s.padStart(k + 1, '0'); s = s.slice(0, -k) + ',' + s.slice(-k); }
    return (q.n < 0n ? '−' : '') + s;
  }

  /* ======================= Anzeige ======================= */
  const MINUS = '−';
  const mi = s => String(s).replace(/-/g, MINUS);
  const sup = e => '<sup>' + mi(e) + '</sup>';
  const frac = (a, b) => '<span class="frac"><span>' + a + '</span><span>' + b + '</span></span>';
  const rad = (inner, n) => '<span class="wz">' + (n && n !== 2 ? '<sup class="wi">' + n + '</sup>' : '') + '√<span class="rad">' + inner + '</span></span>';
  const vI = v => '<i>' + v + '</i>';
  // Zahl schön: ganz, kurze Dezimalzahl (wenn so gewünscht) oder Bruch
  function qHTML(q, dec) {
    if (isInt(q)) return mi(q.n.toString());
    if (dec) { const s = decStr(q); if (s) return s; }
    return (q.n < 0n ? MINUS : '') + frac(abs(q.n).toString(), q.d.toString());
  }
  const qPlain = q => (isInt(q) ? mi(q.n.toString()) : (q.n < 0n ? MINUS : '') + abs(q.n) + '/' + q.d);
  function rw(lines) { return '<div class="rw">' + lines.map(l => '<div>' + l + '</div>').join('') + '</div>'; }
  const note = s => ' <span class="note">' + s + '</span>';
  const b = s => '<b>' + s + '</b>';

  /* ======================= Polynome =======================
     Polynom = { key: Bruch }, key = "a:2|x:-1" (Variablen sortiert), "" = Konstante. */
  function keyOf(ex) { return Object.keys(ex).filter(v => ex[v]).sort().map(v => v + ':' + ex[v]).join('|'); }
  function exOf(key) { const ex = {}; if (key) key.split('|').forEach(p => { const [v, e] = p.split(':'); ex[v] = +e; }); return ex; }
  function pClean(p) { const o = {}; Object.keys(p).forEach(k => { if (p[k].n !== 0n) o[k] = p[k]; }); return o; }
  const pConst = q => pClean({ '': q });
  const pVar = v => ({ [v + ':1']: ONE });
  function pAdd(A, B) { const o = Object.assign({}, A); Object.keys(B).forEach(k => { o[k] = o[k] ? qadd(o[k], B[k]) : B[k]; }); return pClean(o); }
  const pScale = (A, q) => { const o = {}; Object.keys(A).forEach(k => { o[k] = qmul(A[k], q); }); return pClean(o); };
  const pNeg = A => pScale(A, Q(-1));
  const pSub = (A, B) => pAdd(A, pNeg(B));
  function pMul(A, B) {
    let o = {};
    Object.keys(A).forEach(ka => Object.keys(B).forEach(kb => {
      const ea = exOf(ka), eb = exOf(kb);
      Object.keys(eb).forEach(v => { ea[v] = (ea[v] || 0) + eb[v]; });
      const k = keyOf(ea), c = qmul(A[ka], B[kb]);
      o[k] = o[k] ? qadd(o[k], c) : c;
    }));
    return pClean(o);
  }
  const isMonoP = A => Object.keys(A).length === 1;
  function pInvMono(A) {
    if (!isMonoP(A)) throw new Error('mehrgliedrig');
    const k = Object.keys(A)[0], ex = exOf(k);
    Object.keys(ex).forEach(v => { ex[v] = -ex[v]; });
    return { [keyOf(ex)]: qdiv(ONE, A[k]) };
  }
  function pPow(A, e) {
    if (e < 0) return pPow(pInvMono(A), -e);
    if (e > 40) throw new Error('zu groß');
    let o = pConst(ONE); for (let i = 0; i < e; i++) o = pMul(o, A); return o;
  }
  function pDiv(A, B) {
    if (!Object.keys(B).length) throw new Error('div0');
    if (isMonoP(B)) return pMul(A, pInvMono(B));
    const q = pDivPoly(A, B); if (q) return q;
    throw new Error('mehrgliedrig');
  }
  // Exakte Division durch ein mehrgliedriges Polynom (nur wenn sie aufgeht, nur positive Exponenten)
  function pDivPoly(A, B) {
    const lead = P => { const ks = sortKeys(Object.keys(P)); return ks[0]; };
    let R = A, Qt = {}, guard = 0;
    const bl = lead(B);
    while (Object.keys(R).length && guard++ < 40) {
      const rl = lead(R), er = exOf(rl), eb = exOf(bl), et = {};
      let ok = true;
      Object.keys(er).forEach(v => { et[v] = er[v] - (eb[v] || 0); if (et[v] < 0) ok = false; });
      Object.keys(eb).forEach(v => { if (!(v in er)) ok = false; });
      if (!ok) return null;
      const t = { [keyOf(et)]: qdiv(R[rl], B[bl]) };
      Qt = pAdd(Qt, t); R = pSub(R, pMul(t, B));
    }
    return Object.keys(R).length ? null : Qt;
  }
  function pEq(A, B) { const ka = Object.keys(A), kb = Object.keys(B); return ka.length === kb.length && ka.every(k => B[k] && qeq(A[k], B[k])); }
  const vars = A => [...new Set(Object.keys(A).flatMap(k => Object.keys(exOf(k))))].sort();
  const totDeg = k => Object.values(exOf(k)).reduce((s, e) => s + e, 0);
  function sortKeys(ks) {
    const all = [...new Set(ks.flatMap(k => Object.keys(exOf(k))))].sort();
    return ks.slice().sort((a, b) => {
      const d = totDeg(b) - totDeg(a); if (d) return d;
      const ea = exOf(a), eb = exOf(b);
      for (const v of all) { const x = (eb[v] || 0) - (ea[v] || 0); if (x) return x; }
      return 0;
    });
  }
  function monoBody(ex) { return Object.keys(ex).sort().map(v => vI(v) + (ex[v] === 1 ? '' : sup(ex[v]))).join(''); }
  function pHTML(A) {
    const ks = sortKeys(Object.keys(A));
    if (!ks.length) return '0';
    return ks.map((k, j) => {
      const c = A[k], neg = c.n < 0n, ac = Q(abs(c.n), c.d), ex = exOf(k);
      const pos = {}, dn = {}; Object.keys(ex).forEach(v => { if (ex[v] > 0) pos[v] = ex[v]; else dn[v] = -ex[v]; });
      let t;
      if (Object.keys(dn).length) { // negative Exponenten als Bruch zeigen: 5x⁴/a
        const pb = monoBody(pos), up = (ac.n === 1n && pb ? '' : ac.n.toString()) + pb, down = (ac.d === 1n ? '' : ac.d.toString()) + monoBody(dn);
        t = frac(up, down);
      } else { const body = monoBody(ex); t = (body && qeq(ac, ONE) ? '' : qHTML(ac)) + body; }
      return (j ? (neg ? ' − ' : ' + ') : (neg ? MINUS : '')) + t;
    }).join('');
  }
  const pTerms = A => Object.keys(A).length;
  // Klartext für Eingaben/Tests: "4x^2-12xy+9y^2"
  function pStr(A) {
    const ks = sortKeys(Object.keys(A)); if (!ks.length) return '0';
    return ks.map((k, j) => {
      const c = A[k], ex = exOf(k), body = Object.keys(ex).sort().map(v => v + (ex[v] === 1 ? '' : '^' + (ex[v] < 0 ? '(' + ex[v] + ')' : ex[v]))).join('');
      const ac = Q(abs(c.n), c.d), cs = isInt(ac) ? ac.n.toString() : '(' + ac.n + '/' + ac.d + ')';
      return (c.n < 0n ? '-' : j ? '+' : '') + (body && qeq(ac, ONE) ? '' : cs) + body;
    }).join('');
  }
  // Inhalt: ggT der Koeffizienten (bei ganzen Koeffizienten) und gemeinsame Variablen
  function pContentTrivial(A) {
    const ks = Object.keys(A); if (ks.length < 2) return true;
    if (ks.every(k => isInt(A[k]))) { const g = ks.reduce((g, k) => gcd(g, A[k].n), 0n); if (g > 1n) return false; }
    const vs = vars(A);
    return !vs.some(v => ks.every(k => (exOf(k)[v] || 0) > 0));
  }
  function pEval(A, vals) { // vals: {x: Q}
    let s = ZERO;
    Object.keys(A).forEach(k => { const ex = exOf(k); let t = A[k]; Object.keys(ex).forEach(v => { t = qmul(t, qpow(vals[v], ex[v])); }); s = qadd(s, t); });
    return s;
  }

  /* ======================= Wurzel-Zahlen =======================
     Surd = { radikand(string): Bruch } – Summe von c·√r mit r quadratfrei, "1" = rationaler Teil */
  function sqf(n) { // n = k²·r
    n = BigInt(n); if (n < 0n) throw new Error('neg');
    let k = 1n, r = 1n, m = n, p = 2n;
    if (n === 0n) return { k: 0n, r: 1n };
    while (p * p <= m) { let c = 0; while (m % p === 0n) { m /= p; c++; } k *= p ** BigInt(c >> 1); if (c & 1) r *= p; p += p === 2n ? 1n : 2n; if (p > 100000n) break; }
    r *= m; return { k, r };
  }
  function sClean(S) { const o = {}; Object.keys(S).forEach(k => { if (S[k].n !== 0n) o[k] = S[k]; }); return o; }
  const sQ = q => sClean({ 1: q });
  function sAdd(A, B) { const o = Object.assign({}, A); Object.keys(B).forEach(k => { o[k] = o[k] ? qadd(o[k], B[k]) : B[k]; }); return sClean(o); }
  const sNeg = A => { const o = {}; Object.keys(A).forEach(k => { o[k] = qneg(A[k]); }); return o; };
  function sMul(A, B) {
    let o = {};
    Object.keys(A).forEach(ra => Object.keys(B).forEach(rb => {
      const { k, r } = sqf(BigInt(ra) * BigInt(rb)), key = r.toString(), c = qmul(qmul(A[ra], B[rb]), Q(k));
      o[key] = o[key] ? qadd(o[key], c) : c;
    }));
    return sClean(o);
  }
  function sInv(A) {
    const ks = Object.keys(A);
    if (ks.length === 1) { const r = ks[0]; return { [r]: qdiv(ONE, qmul(A[r], Q(BigInt(r)))) }; }
    if (ks.length === 2 && ks.includes('1')) { // a + b√r → (a − b√r)/(a² − b²r)
      const o = ks.find(k => k !== '1'), a = A['1'], c = A[o];
      const den = qsub(qmul(a, a), qmul(qmul(c, c), Q(BigInt(o))));
      return { 1: qdiv(a, den), [o]: qdiv(qneg(c), den) };
    }
    throw new Error('Nenner');
  }
  const sDiv = (A, B) => { if (!Object.keys(B).length) throw new Error('div0'); return sMul(A, sInv(B)); };
  function sPow(A, e) { if (e < 0) return sPow(sInv(A), -e); if (e > 12) throw new Error('zu groß'); let o = sQ(ONE); for (let i = 0; i < e; i++) o = sMul(o, A); return o; }
  function sSqrt(A) {
    const ks = Object.keys(A);
    if (!ks.length) return {};
    if (ks.length !== 1 || ks[0] !== '1') throw new Error('Wurzel aus Wurzel');
    const q = A['1']; if (q.n < 0n) throw new Error('negativ');
    const { k, r } = sqf(q.n * q.d);
    return sClean({ [r.toString()]: Q(k, q.d) });
  }
  const sIsRat = A => Object.keys(A).every(k => k === '1');
  const sRat = A => A['1'] || ZERO;
  function sEq(A, B) { const ka = Object.keys(A), kb = Object.keys(B); return ka.length === kb.length && ka.every(k => B[k] && qeq(A[k], B[k])); }
  function sHTML(A, dec) {
    const ks = Object.keys(A).sort((a, b) => (a === '1' ? -1 : b === '1' ? 1 : Number(BigInt(a) - BigInt(b))));
    if (!ks.length) return '0';
    return ks.map((k, j) => {
      const c = A[k], neg = c.n < 0n, ac = Q(abs(c.n), c.d);
      const body = k === '1' ? qHTML(ac, dec) : (qeq(ac, ONE) ? '' : qHTML(ac)) + rad(k);
      return (j ? (neg ? ' − ' : ' + ') : (neg ? MINUS : '')) + body;
    }).join('');
  }
  const surd = (c, r) => sMul(sQ(Q(c)), sSqrt(sQ(Q(r)))); // c·√r

  /* ======================= Eingabe lesen ======================= */
  const SUPMAP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+' };
  function norm(s) {
    return String(s).trim()
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, m => '^(' + [...m].map(c => SUPMAP[c]).join('') + ')')
      .replace(/[−–—]/g, '-').replace(/[×*⋅∙•]/g, '·').replace(/÷/g, ':')
      .replace(/(sqrt|wurzel|w)\s*(?=[(\d])/gi, '√')
      .replace(/[\[{]/g, '(').replace(/[\]}]/g, ')').replace(/[   ]/g, ' ');
  }
  function tokenize(s) {
    const t = []; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === ' ') { i++; continue; }
      const m = s.slice(i).match(/^\d+(?:[.,]\d+)?/);
      if (m) { t.push({ k: 'n', v: m[0] }); i += m[0].length; continue; }
      if ('+-·/:^()√'.includes(c)) { t.push({ k: c }); i++; continue; }
      if (/[a-zA-Z]/.test(c)) { t.push({ k: 'v', v: c }); i++; continue; }
      throw new Error('Zeichen ' + c);
    }
    return t;
  }
  // AST: n{v,s} v{n} sum{items:[{neg,x}]} prod{items:[{op,x}]} neg{x} pow{b,e} sqrt{x} par{x}
  function parse(str) {
    const t = tokenize(norm(str)); let i = 0;
    if (!t.length) throw new Error('leer');
    const peek = () => t[i] && t[i].k;
    const starts = k => k === 'n' || k === 'v' || k === '(' || k === '√';
    function expr() {
      const items = [];
      let neg = false;
      if (peek() === '-' || peek() === '+') { neg = t[i++].k === '-'; }
      items.push({ neg, x: term() });
      while (peek() === '+' || peek() === '-') { const o = t[i++].k; items.push({ neg: o === '-', x: term() }); }
      return items.length === 1 && !items[0].neg ? items[0].x : { t: 'sum', items };
    }
    function term() {
      const items = [{ op: null, x: imp() }];
      while (peek() === '·' || peek() === '/' || peek() === ':') { const op = t[i++].k; items.push({ op, x: imp() }); }
      return items.length === 1 ? items[0].x : { t: 'prod', items };
    }
    function imp() {
      const items = [{ op: null, x: unary() }];
      while (starts(peek())) items.push({ op: 'i', x: power() });
      return items.length === 1 ? items[0].x : { t: 'prod', items };
    }
    function unary() { if (peek() === '-') { i++; return { t: 'neg', x: unary() }; } if (peek() === '+') { i++; return unary(); } return power(); }
    function power() {
      const bse = atom();
      if (peek() === '^') {
        i++; let sg = 1, par = false;
        if (peek() === '(') { par = true; i++; }
        if (peek() === '-') { sg = -1; i++; } else if (peek() === '+') i++;
        const x = t[i++]; if (!x || x.k !== 'n' || /[.,]/.test(x.v)) throw new Error('Exponent');
        if (par) { if (peek() !== ')') throw new Error(')'); i++; }
        return { t: 'pow', b: bse, e: sg * parseInt(x.v, 10) };
      }
      return bse;
    }
    function atom() {
      const x = t[i++]; if (!x) throw new Error('Ende');
      if (x.k === 'n') return { t: 'n', v: D(x.v), s: x.v.replace('.', ',') };
      if (x.k === 'v') return { t: 'v', n: x.v };
      if (x.k === '(') { const e = expr(); if (peek() !== ')') throw new Error(')'); i++; return { t: 'par', x: e }; }
      if (x.k === '√') { const a = atom(); return { t: 'sqrt', x: a }; }
      throw new Error('unerwartet');
    }
    const e = expr();
    if (i !== t.length) throw new Error('Rest');
    return e;
  }
  function evalP(a) { // AST → Polynom
    switch (a.t) {
      case 'n': return pConst(a.v);
      case 'v': return pVar(a.n);
      case 'par': return evalP(a.x);
      case 'neg': return pNeg(evalP(a.x));
      case 'pow': return pPow(evalP(a.b), a.e);
      case 'sqrt': { const s = evalS(a.x); if (!sIsRat(s)) throw new Error('Wurzel'); const w = sSqrt(s); if (!sIsRat(w)) throw new Error('Wurzel'); return pConst(sRat(w)); }
      case 'sum': return a.items.reduce((s, it) => pAdd(s, it.neg ? pNeg(evalP(it.x)) : evalP(it.x)), {});
      case 'prod': return a.items.reduce((s, it) => (it.op === '/' || it.op === ':' ? pDiv(s, evalP(it.x)) : it.op ? pMul(s, evalP(it.x)) : evalP(it.x)), null);
    }
    throw new Error('?');
  }
  function evalS(a) { // AST → Wurzelzahl
    switch (a.t) {
      case 'n': return sQ(a.v);
      case 'v': throw new Error('Variable');
      case 'par': return evalS(a.x);
      case 'neg': return sNeg(evalS(a.x));
      case 'pow': return sPow(evalS(a.b), a.e);
      case 'sqrt': return sSqrt(evalS(a.x));
      case 'sum': return a.items.reduce((s, it) => sAdd(s, it.neg ? sNeg(evalS(it.x)) : evalS(it.x)), {});
      case 'prod': return a.items.reduce((s, it) => (it.op === '/' || it.op === ':' ? sDiv(s, evalS(it.x)) : it.op ? sMul(s, evalS(it.x)) : evalS(it.x)), null);
    }
    throw new Error('?');
  }
  // AST → HTML (für Angaben und für die Vorschau "Ich lese")
  function aHTML(a, ctx) {
    switch (a.t) {
      case 'n': return a.s;
      case 'v': return vI(a.n);
      case 'par': return '(' + aHTML(a.x) + ')';
      case 'neg': return MINUS + aHTML(a.x);
      case 'pow': return aHTML(a.b) + sup(a.e);
      case 'sqrt': return rad(aHTML(a.x.t === 'par' ? a.x.x : a.x));
      case 'sum': return a.items.map((it, j) => (j ? (it.neg ? ' − ' : ' + ') : it.neg ? MINUS : '') + aHTML(it.x)).join('');
      case 'prod': {
        let out = aHTML(a.items[0].x);
        for (let j = 1; j < a.items.length; j++) {
          const it = a.items[j], x = it.x;
          if (it.op === '/') { out = frac(j === 1 && a.items[0].x.t === 'par' ? aHTML(a.items[0].x.x) : out, aHTML(x.t === 'par' ? x.x : x)); continue; }
          const s = aHTML(x);
          out += it.op === ':' ? ' : ' + s : it.op === '·' ? ' · ' + s : (/^\d/.test(s) && /\d$|<\/sup>$/.test(out) ? '·' : '') + s;
        }
        return out;
      }
    }
    return '?';
  }
  const tex = s => aHTML(parse(s)); // Kurzform für Angaben: tex('(2x-3)^2')
  const poly = s => evalP(parse(s));

  // Intervall "]2; 5]" → {lo, loC, hi, hiC} (lo/hi = null bei ∞)
  function parseInterval(str) {
    let s = String(str).trim().replace(/[−–—]/g, '-').replace(/\s+/g, '')
      .replace(/unendlich|inf|oo|∞/gi, 'I');
    s = s.replace(/^I=/i, '');
    const L = s[0], R = s[s.length - 1];
    if (!'[](' .includes(L) || !'[])'.includes(R)) throw new Error('Klammer');
    let body = s.slice(1, -1), parts;
    if (body.includes(';')) parts = body.split(';');
    else if (body.includes('|')) parts = body.split('|');
    else { const c = body.split(','); if (c.length === 2) parts = c; else throw new Error('Trenner'); }
    if (parts.length !== 2) throw new Error('Trenner');
    const val = p => {
      if (/^[-+]?I$/.test(p)) return { inf: p.startsWith('-') ? -1 : 1 };
      const S = evalS(parse(p)); if (!sIsRat(S)) throw new Error('Grenze'); return { q: sRat(S) };
    };
    const lo = val(parts[0]), hi = val(parts[1]);
    const loC = L === '[', hiC = R === ']';
    if (lo.inf === 1 || hi.inf === -1) throw new Error('Richtung');
    if ((lo.inf && loC) || (hi.inf && hiC)) return { infClosed: true };
    return { lo: lo.inf ? null : lo.q, loC: lo.inf ? false : loC, hi: hi.inf ? null : hi.q, hiC: hi.inf ? false : hiC };
  }
  const ivEq = (a, b) => a.loC === b.loC && a.hiC === b.hiC && (a.lo === null ? b.lo === null : b.lo !== null && qeq(a.lo, b.lo)) && (a.hi === null ? b.hi === null : b.hi !== null && qeq(a.hi, b.hi));
  const ivHas = (I, q) => (I.lo === null || qcmp(q, I.lo) > 0 || (I.loC && qeq(q, I.lo))) && (I.hi === null || qcmp(q, I.hi) < 0 || (I.hiC && qeq(q, I.hi)));
  function ivHTML(I) {
    return (I.loC ? '[' : ']') + (I.lo === null ? MINUS + '∞' : qHTML(I.lo, true)) + '; ' + (I.hi === null ? '∞' : qHTML(I.hi, true)) + (I.hiC ? ']' : '[');
  }
  function ivSet(I) { // {x ∈ ℝ | 2 < x ≤ 5}
    const x = vI('x');
    let c;
    if (I.lo !== null && I.hi !== null) c = qHTML(I.lo, true) + (I.loC ? ' ≤ ' : ' &lt; ') + x + (I.hiC ? ' ≤ ' : ' &lt; ') + qHTML(I.hi, true);
    else if (I.lo !== null) c = x + (I.loC ? ' ≥ ' : ' &gt; ') + qHTML(I.lo, true);
    else c = x + (I.hiC ? ' ≤ ' : ' &lt; ') + qHTML(I.hi, true);
    return '{' + x + ' ∈ ℝ | ' + c + '}';
  }
  // Zahlenliste "−3; 3" → [Bruch]
  function parseList(str) {
    let s = String(str).trim().replace(/[−–—]/g, '-'); if (/\{.*\}/.test(s)) s = s.replace(/^[^{]*\{|\}[^}]*$/g, ''); s = s.replace(/^.*\\/, '').replace(/[{}]/g, '').replace(/±\s*([\d,.]+)/g, '$1;-$1').replace(/\bund\b/gi, ';').trim();
    if (!s) return [];
    let parts;
    if (/[;|]/.test(s)) parts = s.split(/[;|]/);
    else if (/,/.test(s) && s.split(',').every(p => /^\s*-?\d+\s*$/.test(p))) parts = s.split(',');
    else parts = s.split(/\s+/);
    return parts.map(p => p.trim()).filter(Boolean).map(p => { const S = evalS(parse(p)); if (!sIsRat(S)) throw new Error('Zahl'); return sRat(S); });
  }

  /* ======================= Zahlenstrahl (SVG) ======================= */
  function zahlenstrahl(o) {
    const from = o.from, to = o.to, W = 520, H = 64, pad = 26, y = 34;
    const X = v => pad + (W - 2 * pad) * (Number(v) - from) / (to - from);
    let s = '<svg class="zs" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Zahlenstrahl">';
    s += '<line x1="6" y1="' + y + '" x2="' + (W - 6) + '" y2="' + y + '" style="stroke:currentColor;stroke-width:1.4"/>';
    s += '<path d="M' + (W - 12) + ' ' + (y - 5) + ' L' + (W - 4) + ' ' + y + ' L' + (W - 12) + ' ' + (y + 5) + '" style="fill:none;stroke:currentColor;stroke-width:1.4"/>';
    for (let k = Math.ceil(from); k <= to; k++) {
      s += '<line x1="' + X(k) + '" y1="' + (y - 5) + '" x2="' + X(k) + '" y2="' + (y + 5) + '" style="stroke:currentColor;stroke-width:1"/>';
      s += '<text x="' + X(k) + '" y="' + (y + 22) + '" text-anchor="middle" style="fill:currentColor;font:13px var(--sans)">' + mi(k) + '</text>';
    }
    if (o.iv) {
      const I = o.iv, a = I.lo === null ? 8 : X(qToNum(I.lo)), e = I.hi === null ? W - 8 : X(qToNum(I.hi));
      s += '<line x1="' + a + '" y1="' + y + '" x2="' + e + '" y2="' + y + '" style="stroke:var(--accent);stroke-width:5;stroke-linecap:' + (I.lo === null || I.hi === null ? 'butt' : 'butt') + '"/>';
      if (I.lo === null) s += '<path d="M14 ' + (y - 8) + ' L4 ' + y + ' L14 ' + (y + 8) + '" style="fill:none;stroke:var(--accent);stroke-width:3"/>';
      if (I.hi === null) s += '<path d="M' + (W - 14) + ' ' + (y - 8) + ' L' + (W - 4) + ' ' + y + ' L' + (W - 14) + ' ' + (y + 8) + '" style="fill:none;stroke:var(--accent);stroke-width:3"/>';
      const dot = (x, c) => '<circle cx="' + x + '" cy="' + y + '" r="6" style="stroke:var(--accent);stroke-width:2.5;fill:' + (c ? 'var(--accent)' : 'var(--paper)') + '"/>';
      if (I.lo !== null) s += dot(a, I.loC);
      if (I.hi !== null) s += dot(e, I.hiC);
    }
    (o.pts || []).forEach(p => { s += '<circle cx="' + X(p.v) + '" cy="' + y + '" r="4" style="fill:var(--blue)"/><text x="' + X(p.v) + '" y="' + (y - 11) + '" text-anchor="middle" style="fill:var(--blue);font:600 13px var(--sans)">' + p.l + '</text>'; });
    return s + '</svg>';
  }
  const qToNum = q => Number(q.n) / Number(q.d);

  /* ======================= Zufall ======================= */
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const ri = (a, b, r) => a + Math.floor(r() * (b - a + 1));
  const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
  function shuffle(a, r) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const nz = (a, b, r) => { let x; do x = ri(a, b, r); while (x === 0); return x; };
  // Vorzeichen-Hilfe für Term-Strings: sg(3) = "+3", sg(-3) = "-3"
  const sg = n => (n < 0 ? '-' + -n : '+' + n);
  // Koeffizient vor Variable: cf(1,'x') = "x", cf(-1,'x') = "-x", cf(3,'x') = "3x"
  const cf = (c, v) => (c === 1 ? v : c === -1 ? '-' + v : c + v);
  const cfs = (c, v) => (c < 0 ? cf(c, v) : '+' + cf(c, v)); // mit Vorzeichen

  /* ======================= Aufgaben-Bausteine ======================= */
  const GEN = {};
  const choice = (prompt, choices, correct, solution, r, keep) => {
    const order = keep ? choices.map((c, j) => j) : shuffle(choices.map((c, j) => j), r);
    return { mode: 'choice', prompt, choices: order.map(j => choices[j]), correct: order.indexOf(correct), show: choices[correct], solution };
  };
  const multi = (prompt, choices, correctSet, solution) => ({ mode: 'multi', prompt, choices, correct: correctSet.slice().sort(), show: correctSet.map(j => choices[j]).join(', ') || 'keine', solution });
  const numT = (prompt, ans, solution, extra) => Object.assign({ mode: 'num', prompt, ans, show: qHTML(ans, true), solution }, extra || {});
  const surdT = (prompt, ans, solution, extra) => Object.assign({ mode: 'surd', prompt, ans, show: sHTML(ans), solution, ph: 'z. B. 3√5' }, extra || {});
  const polyT = (prompt, ans, solution, form, extra) => Object.assign({ mode: 'poly', prompt, ans, form: form || 'expanded', show: pHTML(ans), solution, ph: 'z. B. 4x^2-12x+9' }, extra || {});
  const ivT = (prompt, ans, solution) => ({ mode: 'interval', prompt, ans, show: ivHTML(ans), solution, ph: 'z. B. ]2; 5]' });
  const listT = (prompt, ans, solution, extra) => Object.assign({ mode: 'list', prompt, ans, show: ans.length ? ans.map(q => qHTML(q, true)).join('; ') : 'keine', solution, ph: 'z. B. -3; 3' }, extra || {});
  const A = s => '<div class="ausdruck">' + s + '</div>';
  const SQ = [2, 3, 5, 6, 7, 10, 11]; // quadratfreie Radikanden
  const WF = ['ja', 'nein'];
  const wahrFalsch = (prompt, isTrue, solution, r) => choice(prompt, ['wahr', 'falsch'], isTrue ? 0 : 1, solution, r, true);

  /* ======================= 1 · Wurzeln: Eigenschaften und Rechenregeln ======================= */
  GEN.wQuad = (r) => {
    const k = pick(['int', 'int', 'dec', 'frac', 'neg', 'big'], r);
    if (k === 'int') { const n = ri(2, 20, r); return numT('Berechne:' + A(rad(n * n)), Q(n), rw([rad(n * n) + ' = ' + b(n) + note('weil ' + n + '² = ' + n * n + ' und ' + n + ' ≥ 0')]), { noRoot: true }); }
    if (k === 'big') { const n = pick([20, 30, 40, 50, 60, 70, 80, 90, 11, 12, 15, 25], r); return numT('Berechne:' + A(rad(n * n)), Q(n), rw([rad(n * n) + ' = ' + b(n) + note(n + '² = ' + n * n)]), { noRoot: true }); }
    if (k === 'dec') {
      const n = ri(1, 12, r), z = pick([1, 2], r), q = Q(n, 10 ** z), sq = qmul(q, q);
      return numT('Berechne:' + A(rad(qHTML(sq, true))), q, rw([rad(qHTML(sq, true)) + ' = ' + b(qHTML(q, true)) + note(qHTML(q, true) + '² = ' + qHTML(sq, true) + ' – doppelt so viele Nachkommastellen unter der Wurzel')]), { noRoot: true });
    }
    if (k === 'frac') {
      let p, q; do { p = ri(1, 9, r); q = ri(2, 12, r); } while (gcd(BigInt(p), BigInt(q)) !== 1n);
      return numT('Berechne:' + A(rad(frac(p * p, q * q))), Q(p, q), rw([rad(frac(p * p, q * q)) + ' = ' + frac(rad(p * p), rad(q * q)) + ' = ' + b(frac(p, q)) + note('Zähler und Nenner getrennt')]), { noRoot: true });
    }
    const n = ri(2, 9, r);
    return numT('Berechne:' + A(rad('(−' + n + ')<sup>2</sup>')), Q(n), rw([rad('(−' + n + ')<sup>2</sup>') + ' = ' + rad(n * n) + ' = ' + b(n) + note('eine Quadratwurzel ist nie negativ: √(a²) = |a|')]), { noRoot: true });
  };
  GEN.wMalDiv = (r) => {
    for (let g = 0; g < 200; g++) {
      const a = pick([2, 3, 5, 6, 7, 8, 10, 12, 18, 20, 27, 32, 45, 50], r), c = pick([2, 3, 5, 6, 7, 8, 10, 12, 18, 20, 27, 32, 45, 50, 72, 98], r);
      if (r() < 0.55) {
        const { k, r: rr } = sqf(a * c); if (rr !== 1n || a === c) continue;
        return numT('Berechne ohne Taschenrechner:' + A(rad(a) + ' · ' + rad(c)), Q(k),
          rw([rad(a) + ' · ' + rad(c) + ' = ' + rad(a + ' · ' + c) + note('√a · √b = √(a·b)'), '= ' + rad(a * c) + ' = ' + b(k)]), { noRoot: true });
      }
      const m = ri(2, 6, r), big = a * m * m; if (big > 400) continue;
      return numT('Berechne ohne Taschenrechner:' + A(rad(big) + ' : ' + rad(a)), Q(m),
        rw([rad(big) + ' : ' + rad(a) + ' = ' + rad(big + ' : ' + a) + note('√a : √b = √(a : b)'), '= ' + rad(m * m) + ' = ' + b(m)]), { noRoot: true });
    }
    return GEN.wMalDiv(r);
  };
  GEN.wQuadrat = (r) => {
    const n = pick(SQ.concat([13, 15, 17]), r);
    if (r() < 0.4) return numT('Berechne:' + A('(' + rad(n) + ')<sup>2</sup>'), Q(n), rw(['(' + rad(n) + ')<sup>2</sup> = ' + b(n) + note('Quadrieren hebt die Wurzel auf')]), { noRoot: true });
    const c = ri(2, 6, r), neg = r() < 0.3;
    const s = (neg ? '(−' : '(') + c + rad(n) + ')<sup>2</sup>';
    return numT('Berechne:' + A(s), Q(c * c * n), rw([s + ' = ' + (neg ? '(−' + c + ')' : c) + '<sup>2</sup> · (' + rad(n) + ')<sup>2</sup>' + note('jeden Faktor quadrieren'), '= ' + c * c + ' · ' + n + ' = ' + b(c * c * n)]), { noRoot: true });
  };
  GEN.wSumme = (r) => { // √(a+b) ≠ √a + √b
    const P = [[9, 16, 5], [36, 64, 10], [25, 144, 13], [64, 225, 17], [81, 144, 15], [9, 40, 7], [16, 9, 5], [100, 21, 11]];
    const [a, c, w] = pick(P, r);
    const plus = r() < 0.7;
    if (plus) return numT('Berechne:' + A(rad(a + ' + ' + c)), Q(w), rw([rad(a + ' + ' + c) + ' = ' + rad(a + c) + ' = ' + b(w) + note('erst unter der Wurzel rechnen!')]) +
      (Number.isInteger(Math.sqrt(a)) && Number.isInteger(Math.sqrt(c)) ? '<p>Falsch wäre ' + rad(a) + ' + ' + rad(c) + ' = ' + (Math.sqrt(a) + Math.sqrt(c)) + '. Für + und − gibt es <b>keine</b> Wurzelregel.</p>' : ''), { noRoot: true });
    const P2 = [[25, 9, 4], [100, 36, 8], [169, 25, 12], [25, 16, 3], [100, 64, 6]];
    const [x, y, z] = pick(P2, r);
    return numT('Berechne:' + A(rad(x + ' − ' + y)), Q(z), rw([rad(x + ' − ' + y) + ' = ' + rad(x - y) + ' = ' + b(z) + note('erst unter der Wurzel rechnen!')]) + '<p>Falsch wäre ' + rad(x) + ' − ' + rad(y) + ' = ' + (Math.sqrt(x) - Math.sqrt(y)) + '.</p>', { noRoot: true });
  };
  const REGELN = [
    { s: rad('<i>a</i> · <i>b</i>') + ' = ' + rad('<i>a</i>') + ' · ' + rad('<i>b</i>'), ok: true, w: 'Produktregel (für a, b ≥ 0).' },
    { s: rad(frac('<i>a</i>', '<i>b</i>')) + ' = ' + frac(rad('<i>a</i>'), rad('<i>b</i>')), ok: true, w: 'Quotientenregel (a ≥ 0, b &gt; 0).' },
    { s: '(' + rad('<i>a</i>') + ')<sup>2</sup> = <i>a</i>', ok: true, w: 'Quadrieren hebt die Wurzel auf (a ≥ 0).' },
    { s: rad('<i>a</i><sup>2</sup>') + ' = |<i>a</i>|', ok: true, w: 'Eine Wurzel ist nie negativ, z. B. √((−3)²) = √9 = 3.' },
    { s: rad('<i>a</i> + <i>b</i>') + ' = ' + rad('<i>a</i>') + ' + ' + rad('<i>b</i>'), ok: false, w: 'Gegenbeispiel: √(9+16) = √25 = 5, aber √9 + √16 = 7.' },
    { s: rad('<i>a</i> − <i>b</i>') + ' = ' + rad('<i>a</i>') + ' − ' + rad('<i>b</i>'), ok: false, w: 'Gegenbeispiel: √(25−16) = 3, aber √25 − √16 = 1.' },
    { s: rad('−9') + ' = −3', ok: false, w: 'Aus negativen Zahlen gibt es in ℝ keine Quadratwurzel – (−3)² = +9.' },
    { s: rad('<i>a</i><sup>2</sup>') + ' = <i>a</i> für jedes <i>a</i>', ok: false, w: 'Nur für a ≥ 0. Für a = −3: √9 = 3 ≠ −3.' },
    { s: '2' + rad(3) + ' + 4' + rad(3) + ' = 6' + rad(3), ok: true, w: 'Gleiche Wurzeln fasst man zusammen wie 2x + 4x = 6x.' },
    { s: rad(2) + ' + ' + rad(3) + ' = ' + rad(5), ok: false, w: '√2 + √3 ≈ 1,41 + 1,73 = 3,15, aber √5 ≈ 2,24.' },
    { s: rad(16) + ' = ±4', ok: false, w: 'Das Wurzelzeichen bedeutet immer die nicht-negative Lösung: √16 = 4.' },
    { s: '0 · ' + rad(7) + ' = 0 und ' + rad(0) + ' = 0', ok: true, w: '0² = 0.' }
  ];
  GEN.wRegel = (r) => { const R = pick(REGELN, r); return wahrFalsch('Stimmt diese Aussage?' + A(R.s), R.ok, '<p>' + (R.ok ? '<b>Wahr.</b> ' : '<b>Falsch.</b> ') + R.w + '</p>', r); };
  GEN.wSchaetzen = (r) => {
    let n; do { n = ri(5, 140, r); } while (Number.isInteger(Math.sqrt(n)));
    const lo = Math.floor(Math.sqrt(n)), opts = [lo - 1, lo, lo + 1, lo + 2].filter(x => x >= 1).slice(0, 4);
    const ch = opts.map(x => x + ' und ' + (x + 1));
    return choice('Zwischen welchen zwei aufeinanderfolgenden ganzen Zahlen liegt ' + rad(n) + '?', ch, opts.indexOf(lo),
      rw([lo + '² = ' + lo * lo + ' &lt; ' + n + ' &lt; ' + (lo + 1) * (lo + 1) + ' = ' + (lo + 1) + '²', '→ ' + lo + ' &lt; ' + rad(n) + ' &lt; ' + (lo + 1) + note('Quadratzahlen davor und danach suchen')]), r);
  };

  /* ======================= 2 · Teilweise Wurzelziehen, unter die Wurzel bringen ======================= */
  function teilZiel(r) { const k = ri(2, 10, r), q = pick(SQ, r); return k * k * q <= 1000 ? { k, q, n: k * k * q } : teilZiel(r); }
  GEN.wTeil = (r) => {
    const { k, q, n } = teilZiel(r);
    const pre = r() < 0.2 ? ri(2, 4, r) : 1;
    const ans = surd(pre * k, q);
    const lead = pre > 1 ? pre : '';
    return surdT('Ziehe teilweise die Wurzel:' + A(lead + rad(n)), ans,
      rw([lead + rad(n) + ' = ' + lead + rad(k * k + ' · ' + q) + note('größte Quadratzahl ' + k * k + ' suchen'),
        '= ' + lead + (pre > 1 ? ' · ' : '') + rad(k * k) + ' · ' + rad(q) + ' = ' + (pre > 1 ? pre + ' · ' : '') + k + rad(q),
        '= ' + b(sHTML(ans))]) + '<p class="hint">Probe: ' + sHTML(ans) + ' = ' + rad((pre * k) * (pre * k) * q) + (pre > 1 ? '' : ' ✓') + '</p>', { simplified: true });
  };
  GEN.wUnter = (r) => {
    const c = ri(2, 9, r), q = pick(SQ.concat([3, 5, 2]), r);
    return numT('Bringe den Faktor unter die Wurzel:' + A(c + rad(q) + ' = ' + rad('▢')) + 'Welche Zahl steht unter der Wurzel?', Q(c * c * q),
      rw([c + rad(q) + ' = ' + rad(c + '<sup>2</sup> · ' + q) + note('der Faktor kommt quadriert hinein'), '= ' + rad(c * c + ' · ' + q) + ' = ' + rad(b(c * c * q))]), { ph: 'Zahl unter der Wurzel', noRoot: true, show: rad(c * c * q) });
  };
  GEN.wVergleich = (r) => {
    for (let g = 0; g < 200; g++) {
      const a = ri(2, 7, r), x = pick([2, 3, 5, 6, 7, 10], r), c = ri(2, 7, r), y = pick([2, 3, 5, 6, 7, 10, 11], r);
      const A2 = a * a * x, C2 = c * c * y; if (A2 === C2 || Math.abs(A2 - C2) > 25 || a === c) continue;
      const s1 = a + rad(x), s2 = c + rad(y);
      const ch = [s1 + ' ist größer', s2 + ' ist größer'];
      return choice('Welche Zahl ist größer? (ohne Taschenrechner)' + A(s1 + ' &nbsp;oder&nbsp; ' + s2), ch, A2 > C2 ? 0 : 1,
        rw([s1 + ' = ' + rad(a * a + ' · ' + x) + ' = ' + rad(A2), s2 + ' = ' + rad(c * c + ' · ' + y) + ' = ' + rad(C2), 'größerer Radikand → größere Wurzel: ' + b(A2 > C2 ? s1 : s2) + note('beide Faktoren unter die Wurzel bringen')]), r, true);
    }
  };
  GEN.wZusammen = (r) => {
    for (let g = 0; g < 300; g++) {
      const q = pick([2, 3, 5, 6, 7], r), cnt = ri(2, 3, r);
      const terms = [], parts = [];
      for (let j = 0; j < cnt; j++) {
        const k = pick([1, 1, 2, 3, 4, 5], r), pre = k === 1 ? nz(-5, 7, r) : pick([1, 1, 2, -1, 3], r);
        terms.push({ k, pre });
      }
      if (terms.every(t => t.k === 1)) continue;
      let ans = {}, str = '', st1 = '';
      terms.forEach((t, j) => {
        const n = t.k * t.k * q, a = Math.abs(t.pre), sgnS = t.pre < 0 ? ' − ' : j ? ' + ' : '';
        str += (j || t.pre < 0 ? (j ? sgnS : MINUS) : '') + (a === 1 ? '' : a) + rad(n);
        st1 += (j ? (t.pre * t.k < 0 ? ' − ' : ' + ') : t.pre < 0 ? MINUS : '') + (Math.abs(t.pre * t.k) === 1 ? '' : Math.abs(t.pre * t.k)) + rad(q);
        ans = sAdd(ans, surd(t.pre * t.k, q));
      });
      if (!Object.keys(ans).length) continue;
      return surdT('Vereinfache so weit wie möglich:' + A(str), ans,
        rw([str, '= ' + st1 + note('jede Wurzel teilweise ziehen'), '= ' + b(sHTML(ans)) + note('gleiche Wurzeln zusammenfassen')]), { simplified: true });
    }
  };
  GEN.wMalTeil = (r) => {
    for (let g = 0; g < 300; g++) {
      const a = pick([2, 3, 5, 6, 8, 10, 12, 15], r), c = pick([2, 3, 6, 8, 10, 12, 15, 18, 20], r);
      if (a === c) continue;
      const { k, r: q } = sqf(a * c); if (k === 1n || q === 1n || a * c > 300) continue;
      const ans = surd(Number(k), Number(q));
      return surdT('Berechne und vereinfache:' + A(rad(a) + ' · ' + rad(c)), ans,
        rw([rad(a) + ' · ' + rad(c) + ' = ' + rad(a * c) + note('Produktregel'), '= ' + rad(Number(k * k) + ' · ' + q) + ' = ' + b(sHTML(ans)) + note('teilweise Wurzelziehen')]), { simplified: true });
    }
  };
  GEN.wKlammer = (r) => {
    if (r() < 0.5) {
      const q = pick([2, 3, 5], r), m = pick([2, 3], r), c = nz(-5, 5, r);
      // √q · (√(m²q) + c)
      const n = m * m * q, ans = sAdd(sQ(Q(m * q)), surd(c, q));
      return surdT('Multipliziere aus und vereinfache:' + A(rad(q) + ' · (' + rad(n) + (c < 0 ? ' − ' : ' + ') + Math.abs(c) + ')'), ans,
        rw([rad(q) + ' · ' + rad(n) + (c < 0 ? ' − ' : ' + ') + Math.abs(c) + rad(q) + note('jeden Summanden mit √' + q + ' multiplizieren'),
          '= ' + rad(q * n) + (c < 0 ? ' − ' : ' + ') + Math.abs(c) + rad(q) + ' = ' + b(sHTML(ans)) + note(q * n + ' = ' + (m * q) + '²')]), { simplified: true });
    }
    const q = pick([2, 3, 5, 7], r), c = nz(-4, 4, r), plus = c > 0;
    const ans = sAdd(sQ(Q(q + c * c)), surd(2 * c, q));
    return surdT('Berechne mit der binomischen Formel:' + A('(' + rad(q) + (plus ? ' + ' : ' − ') + Math.abs(c) + ')<sup>2</sup>'), ans,
      rw(['= (' + rad(q) + ')<sup>2</sup> ' + (plus ? '+' : '−') + ' 2 · ' + Math.abs(c) + ' · ' + rad(q) + ' + ' + Math.abs(c) + '<sup>2</sup>' + note('(a ± b)² = a² ± 2ab + b²'),
        '= ' + q + (plus ? ' + ' : ' − ') + 2 * Math.abs(c) + rad(q) + ' + ' + c * c, '= ' + b(sHTML(ans))]), { simplified: true });
  };

  /* ======================= 3 · Zahlenmengen ======================= */
  const MENGEN = ['ℕ', 'ℤ', 'ℚ', 'ℝ'];
  const PI = 'π';
  // [Anzeige, Ebene 0=ℕ 1=ℤ 2=ℚ 3=irrational, Begründung]
  const ZAHLEN = [
    ['7', 0, 'natürliche Zahl'], ['0', 0, 'in Österreich gehört 0 zu ℕ = {0, 1, 2, …}'], ['−4', 1, 'negative ganze Zahl'], ['−12', 1, 'negative ganze Zahl'],
    [frac(3, 4), 2, 'Bruch, nicht ganz'], ['−' + frac(2, 5), 2, 'Bruch'], ['0,25', 2, 'abbrechende Dezimalzahl = 1/4'], ['−1,5', 2, 'abbrechende Dezimalzahl = −3/2'],
    ['0,<span class="per">3</span>', 2, 'periodisch = 1/3, also rational'], ['2,<span class="per">18</span>', 2, 'periodische Dezimalzahl → rational'],
    [rad(16), 0, '√16 = 4'], ['−' + rad(9), 1, '−√9 = −3'], [rad(2), 3, 'keine Quadratzahl unter der Wurzel → unendlich, nicht periodisch'], [rad(10), 3, '10 ist keine Quadratzahl'],
    [PI, 3, 'π = 3,14159… unendlich, nicht periodisch'], [rad('0,49'), 2, '√0,49 = 0,7'], [frac(12, 4), 0, '12/4 = 3'], [frac(rad(8), rad(2)), 0, '√8 : √2 = √4 = 2'],
    ['2' + rad(3), 3, 'Vielfaches einer irrationalen Zahl'], ['1,4142', 2, 'abbrechend (nur eine Näherung für √2!)'], [rad(frac(1, 4)), 2, '√(1/4) = 1/2'], ['−' + frac(18, 6), 1, '−18/6 = −3'],
    ['0,1010010001…', 3, 'unendlich und nicht periodisch'], [rad(3) + ' · ' + rad(3), 0, '√3 · √3 = 3']
  ];
  GEN.zmKleinste = (r) => {
    const [z, lvl, why] = pick(ZAHLEN, r);
    const ch = ['ℕ', 'ℤ', 'ℚ', 'ℝ\\ℚ'];
    return choice('Zu welcher Zahlenmenge gehört die Zahl <b>zuerst</b> – also welche ist die <b>kleinste</b> passende Menge?' + A(z), ch, lvl,
      '<p>' + z + ': ' + why + ' → kleinste Menge ' + b(ch[lvl]) + (lvl === 3 ? ' (irrational)' : '') + '.</p><p class="hint">ℕ ⊂ ℤ ⊂ ℚ ⊂ ℝ – wer in ℕ ist, ist automatisch auch in ℤ, ℚ und ℝ.</p>', r, true);
  };
  GEN.zmAnkreuzen = (r) => {
    const [z, lvl, why] = pick(ZAHLEN, r);
    const correct = lvl === 3 ? [3] : [0, 1, 2, 3].filter(j => j >= lvl);
    return multi('Kreuze <b>alle</b> Zahlenmengen an, zu denen die Zahl gehört:' + A(z), MENGEN, correct,
      '<p>' + z + ': ' + why + '.</p><p>' + (lvl === 3 ? 'Irrationale Zahlen liegen nur in ℝ, <b>nicht</b> in ℚ.' : 'Liegt in ' + MENGEN[lvl] + ' und damit auch in allen größeren Mengen: ' + correct.map(j => MENGEN[j]).join(', ') + '.') + '</p>');
  };
  const AUSSAGEN = [
    ['Jede natürliche Zahl ist auch eine ganze Zahl.', true, 'ℕ ⊂ ℤ.'],
    ['Jede ganze Zahl ist auch eine rationale Zahl.', true, 'z. B. −5 = −5/1.'],
    ['Jede rationale Zahl ist eine ganze Zahl.', false, '1/2 ist rational, aber nicht ganz.'],
    ['Jede reelle Zahl ist rational.', false, '√2 und π sind reell, aber irrational.'],
    ['Die Differenz zweier natürlicher Zahlen ist immer eine natürliche Zahl.', false, '3 − 5 = −2 ∉ ℕ. Erst in ℤ ist Subtraktion immer möglich.'],
    ['Die Summe zweier natürlicher Zahlen ist immer eine natürliche Zahl.', true, 'ℕ ist bezüglich + abgeschlossen.'],
    ['Der Quotient zweier ganzer Zahlen (Divisor ≠ 0) ist immer eine ganze Zahl.', false, '1 : 3 = 1/3 ∉ ℤ. Dafür braucht man ℚ.'],
    ['Der Quotient zweier rationaler Zahlen (Divisor ≠ 0) ist immer rational.', true, 'In ℚ ist Division (außer durch 0) immer möglich.'],
    ['Die Summe zweier irrationaler Zahlen ist immer irrational.', false, '√2 + (−√2) = 0 ist rational.'],
    ['Das Produkt zweier irrationaler Zahlen ist immer irrational.', false, '√2 · √2 = 2 ist rational.'],
    ['Jede periodische Dezimalzahl ist eine rationale Zahl.', true, 'z. B. 0,333… = 1/3.'],
    ['Jede abbrechende Dezimalzahl ist eine rationale Zahl.', true, 'z. B. 0,75 = 3/4.'],
    ['Irrationale Zahlen haben unendlich viele Nachkommastellen ohne Periode.', true, 'Genau das ist die Definition.'],
    ['Zwischen zwei verschiedenen rationalen Zahlen liegt immer noch eine rationale Zahl.', true, 'z. B. ihr Mittelwert (a + b)/2 – ℚ ist „dicht“.'],
    ['Zwischen 2 und 3 liegt keine ganze Zahl.', true, 'Ganze Zahlen liegen „mit Abstand 1“ – ℤ ist nicht dicht.'],
    ['ℤ hat eine kleinste Zahl.', false, 'Zu jeder ganzen Zahl gibt es eine kleinere.'],
    ['ℕ hat eine kleinste Zahl.', true, 'Die 0.'],
    ['Die Zahl 0 ist eine natürliche Zahl.', true, 'In Österreich (Schule, Matura): ℕ = {0, 1, 2, 3, …}.'],
    ['−√25 ist eine ganze Zahl.', true, '−√25 = −5 ∈ ℤ.'],
    ['√7 ist eine rationale Zahl.', false, '7 ist keine Quadratzahl, also ist √7 irrational.'],
    ['π ist eine rationale Zahl, weil π = 3,14.', false, '3,14 ist nur eine Näherung; π ist irrational.'],
    ['Jede Quadratwurzel ist irrational.', false, '√9 = 3 ist rational.'],
    ['ℚ enthält alle Brüche mit ganzzahligem Zähler und Nenner ≠ 0.', true, 'Das ist die Definition von ℚ.'],
    ['Die reellen Zahlen füllen die Zahlengerade lückenlos aus.', true, 'Zu jedem Punkt der Zahlengerade gehört genau eine reelle Zahl.']
  ];
  GEN.zmAussage = (r) => { const [s, ok, w] = pick(AUSSAGEN, r); return wahrFalsch('Wahr oder falsch?' + A('<span style="font-size:.85em">' + s + '</span>'), ok, '<p><b>' + (ok ? 'Wahr' : 'Falsch') + '.</b> ' + w + '</p>', r); };
  GEN.zmOperation = (r) => {
    const O = [['die Subtraktion (a − b)', 1, 'In ℕ geht 3 − 5 nicht; in ℤ immer.'], ['die Addition (a + b)', 0, 'Natürlich + natürlich ist natürlich.'],
      ['die Division (a : b, b ≠ 0)', 2, 'In ℤ geht 1 : 3 nicht; in ℚ immer.'], ['die Multiplikation (a · b)', 0, 'Natürlich · natürlich ist natürlich.'],
      ['das Quadratwurzelziehen aus Zahlen ≥ 0', 3, 'In ℚ geht √2 nicht; erst in ℝ.']];
    const [op, lvl, w] = pick(O, r);
    return choice('In welcher Zahlenmenge ist ' + op + ' <b>immer</b> ausführbar? Wähle die kleinste Menge.', MENGEN, lvl, '<p>' + w + ' → ' + b(MENGEN[lvl]) + '</p>', r, true);
  };
  GEN.zmPeriode = (r) => {
    if (r() < 0.5) { const d = ri(1, 8, r); return numT('Schreibe als Bruch:' + A('0,<span class="per">' + d + '</span>'), Q(d, 9), rw(['0,<span class="per">' + d + '</span> = ' + frac(d, 9) + (gcd(BigInt(d), 9n) > 1n ? ' = ' + b(qHTML(Q(d, 9))) : '') + note('einstellige Periode: Periode durch 9')]), { noRoot: true, show: qHTML(Q(d, 9)) }); }
    const d = ri(1, 98, r); if (d % 11 === 0) return GEN.zmPeriode(r);
    const ds = String(d).padStart(2, '0');
    return numT('Schreibe als Bruch:' + A('0,<span class="per">' + ds + '</span>'), Q(d, 99), rw(['0,<span class="per">' + ds + '</span> = ' + frac(d, 99) + (gcd(BigInt(d), 99n) > 1n ? ' = ' + b(qHTML(Q(d, 99))) : '') + note('zweistellige Periode: Periode durch 99')]), { noRoot: true, show: qHTML(Q(d, 99)) });
  };

  /* ======================= 4 · Intervalle ======================= */
  function randIv(r, inf) {
    let lo = ri(-6, 4, r), hi = lo + ri(2, 7, r);
    const I = { lo: Q(lo), hi: Q(hi), loC: r() < 0.5, hiC: r() < 0.5 };
    if (inf && r() < 0.35) { if (r() < 0.5) { I.lo = null; I.loC = false; } else { I.hi = null; I.hiC = false; } }
    return I;
  }
  const ivWords = I => {
    const p = [];
    if (I.lo !== null) p.push((I.loC ? '[' : ']') + ' bei ' + qHTML(I.lo) + ': ' + (I.loC ? 'gehört dazu (≤)' : 'gehört nicht dazu (&lt;)'));
    else p.push('links unbeschränkt: ]−∞ (bei ∞ immer offen)');
    if (I.hi !== null) p.push((I.hiC ? ']' : '[') + ' bei ' + qHTML(I.hi) + ': ' + (I.hiC ? 'gehört dazu (≤)' : 'gehört nicht dazu (&lt;)'));
    else p.push('rechts unbeschränkt: ∞[ (bei ∞ immer offen)');
    return p;
  };
  const ivRange = I => { const lo = I.lo === null ? qToNum(I.hi) - 6 : qToNum(I.lo), hi = I.hi === null ? qToNum(I.lo) + 6 : qToNum(I.hi); return { from: Math.floor(lo) - 2, to: Math.ceil(hi) + 2 }; };
  GEN.ivAusMenge = (r) => {
    const I = randIv(r, true);
    return ivT('Schreibe als Intervall:' + A(ivSet(I)), I, rw(ivWords(I).concat(['→ ' + b(ivHTML(I))])) + zahlenstrahl(Object.assign({ iv: I }, ivRange(I))));
  };
  GEN.ivAusBild = (r) => {
    const I = randIv(r, true), rg = ivRange(I);
    return ivT('Welches Intervall ist eingezeichnet? <span class="hint">(● gehört dazu, ○ gehört nicht dazu)</span>' + zahlenstrahl(Object.assign({ iv: I }, rg)), I, rw(ivWords(I).concat(['→ ' + b(ivHTML(I))])));
  };
  GEN.ivText = (r) => {
    const I = randIv(r, true);
    const w = (q, c, up) => (up ? (c ? 'mindestens ' : 'größer als ') : (c ? 'höchstens ' : 'kleiner als ')) + qHTML(q);
    const parts = [];
    if (I.lo !== null) parts.push(w(I.lo, I.loC, true));
    if (I.hi !== null) parts.push(w(I.hi, I.hiC, false));
    return ivT('Schreibe als Intervall:' + A('<span style="font-size:.85em">alle reellen Zahlen, die ' + parts.join(' und ') + ' sind</span>'), I,
      '<p>„mindestens“ = ≥ → eckige Klammer zur Zahl hin. „höchstens“ = ≤ → ebenso. „größer/kleiner als“ → Klammer von der Zahl weg.</p>' + rw([ivSet(I) + ' = ' + b(ivHTML(I))]));
  };
  GEN.ivZuMenge = (r) => {
    const I = randIv(r, false), base = { lo: I.lo, hi: I.hi };
    const vars4 = [[true, true], [true, false], [false, true], [false, false]].map(([a, c]) => ivSet(Object.assign({}, base, { loC: a, hiC: c })));
    const idx = [[true, true], [true, false], [false, true], [false, false]].findIndex(([a, c]) => a === I.loC && c === I.hiC);
    return choice('Welche Mengenschreibweise passt zum Intervall?' + A(ivHTML(I)), vars4, idx, rw(ivWords(I).concat(['→ ' + b(ivSet(I))])), r);
  };
  GEN.ivElement = (r) => {
    const I = randIv(r, true);
    const cands = [];
    if (I.lo !== null) cands.push(I.lo, qadd(I.lo, Q(1, 2)), qsub(I.lo, Q(1, 10)));
    if (I.hi !== null) cands.push(I.hi, qsub(I.hi, Q(1, 10)), qadd(I.hi, Q(1, 2)));
    const q = pick(cands, r), inside = ivHas(I, q);
    return choice('Liegt die Zahl ' + b(qHTML(q, true)) + ' im Intervall ' + ivHTML(I) + '?', ['ja', 'nein'], inside ? 0 : 1,
      '<p>' + ivSet(I) + '</p><p>Setze ' + qHTML(q, true) + ' ein: ' + (inside ? 'die Bedingung stimmt → ' + b('ja') : 'die Bedingung stimmt nicht → ' + b('nein')) + '.' + (I.lo !== null && qeq(q, I.lo) || I.hi !== null && qeq(q, I.hi) ? ' Es ist eine Randzahl – entscheidend ist, ob die Klammer zur Zahl hin (dazu) oder weg (nicht dazu) zeigt.' : '') + '</p>', r, true);
  };
  GEN.ivGanze = (r) => {
    const I = randIv(r, false);
    const ans = []; for (let k = Number(I.lo.n); k <= Number(I.hi.n); k++) if (ivHas(I, Q(k))) ans.push(Q(k));
    return listT('Gib <b>alle ganzen Zahlen</b> an, die im Intervall liegen (getrennt mit ;):' + A(ivHTML(I)), ans,
      rw(ivWords(I).concat(['→ ' + b(ans.map(q => qHTML(q)).join('; '))])) + zahlenstrahl(Object.assign({ iv: I }, ivRange(I))));
  };

  /* ======================= 5 · Termarten, Bruchterme, Aufstellen ======================= */
  GEN.tmArt = (r) => {
    const T = [['3x^2y', 0], ['-5ab', 0], ['7', 0], ['2x+3', 1], ['a^2-b^2', 1], ['4xy-1', 1], ['x^2+2x+1', 2], ['a-b+c', 2], ['3x^2-x+5', 2], ['x^3+x^2-x+1', 3], ['a+b+c+d', 3]];
    const [t, k] = pick(T, r), ch = ['Monom', 'Binom', 'Trinom', 'Polynom'];
    const n = [1, 2, 3, 4][k];
    return choice('Welche Termart ist das? (Mit „Polynom“ ist hier ein Term mit 4 oder mehr Gliedern gemeint.)' + A(tex(t)), ch, k,
      '<p>Zähle die durch + oder − getrennten Glieder: ' + (n === 4 ? '4 oder mehr' : n) + ' → ' + b(ch[k]) + '. Mono = 1, Bi = 2, Tri = 3, Poly = viele.</p>', r, true);
  };
  GEN.tmBruchErk = (r) => {
    const yes = [tex('3/x'), tex('(x+1)/(x-2)'), tex('5/(2a)'), tex('a/(a+b)'), tex('1/x+2')];
    const no = [tex('x/3'), tex('(x+1)/5'), tex('2x-1/4'), tex('(a^2+b)/7'), tex('x^2/2')];
    const y = pick(yes, r), ns = shuffle(no, r).slice(0, 3);
    return choice('Welcher dieser Terme ist ein <b>Bruchterm</b>?', [y].concat(ns), 0, '<p>Ein Bruchterm hat eine <b>Variable im Nenner</b>. Bei ' + ns[0] + ' steht im Nenner nur eine Zahl – das ist ein ganz normaler Term (Bruchzahl als Koeffizient).</p><p>Richtig: ' + y + '</p>', r);
  };
  GEN.tmDef = (r) => {
    const k = pick(['lin', 'lin', 'lin2', 'prod', 'x', 'diff', 'sum'], r);
    let num = pick(['3', 'x', '2x', 'x+1', '5'], r), den, zeros, why;
    if (k === 'lin') { const a = nz(-9, 9, r); den = 'x' + sg(-a); zeros = [Q(a)]; why = ['x ' + (a > 0 ? '− ' + a : '+ ' + -a) + ' = 0 → x = ' + a]; }
    else if (k === 'lin2') { const c = pick([2, 3, 4, 5], r), z = nz(-4, 4, r); den = c + 'x' + sg(-c * z); zeros = [Q(z)]; why = [c + 'x ' + (z > 0 ? '− ' + c * z : '+ ' + -c * z) + ' = 0 → ' + c + 'x = ' + c * z + ' → x = ' + z]; }
    else if (k === 'prod') { const a = nz(-6, 6, r); let c; do c = nz(-6, 6, r); while (c === a); den = '(x' + sg(-a) + ')(x' + sg(-c) + ')'; zeros = [Q(a), Q(c)]; why = ['Ein Produkt ist 0, wenn ein Faktor 0 ist:', 'x ' + (a > 0 ? '− ' + a : '+ ' + -a) + ' = 0 → x = ' + a + ' &nbsp;oder&nbsp; x ' + (c > 0 ? '− ' + c : '+ ' + -c) + ' = 0 → x = ' + c]; }
    else if (k === 'x') { const a = nz(-6, 6, r); den = 'x(x' + sg(-a) + ')'; zeros = [Q(0), Q(a)]; why = ['x = 0 &nbsp;oder&nbsp; x ' + (a > 0 ? '− ' + a : '+ ' + -a) + ' = 0 → x = ' + a]; num = pick(['3', '5', '2x+1'], r); }
    else if (k === 'diff') { const a = ri(1, 9, r); den = 'x^2-' + a * a; zeros = [Q(-a), Q(a)]; why = ['x² − ' + a * a + ' = 0 → x² = ' + a * a + ' → x = ' + a + ' oder x = −' + a + note('(−' + a + ')² = ' + a * a + ' auch!')]; }
    else { const a = ri(1, 9, r); den = 'x^2+' + a * a; zeros = []; why = ['x² ist nie negativ, also x² + ' + a * a + ' ≥ ' + a * a + ' &gt; 0', 'Der Nenner wird nie 0 → keine Zahl muss ausgeschlossen werden']; }
    const T = tex('(' + num + ')/(' + den + ')');
    const Dm = zeros.length ? 'ℝ\\{' + zeros.slice().sort(qcmp).map(q => qHTML(q)).join('; ') + '}' : 'ℝ';
    return listT('Für welche Zahlen ist der Bruchterm <b>nicht definiert</b>? (mehrere mit ; trennen, „keine“ wenn es keine gibt)' + A(T), zeros.slice().sort(qcmp),
      '<p>Der Nenner darf nicht 0 werden. Also: Nenner = 0 setzen.</p>' + rw(why.concat(['Definitionsmenge: ' + b('D = ' + Dm)])), { ph: 'z. B. 3 oder -2; 2' });
  };
  GEN.tmWert = (r) => {
    for (let g = 0; g < 100; g++) {
      const a = nz(-4, 5, r), c = nz(-5, 5, r), x = nz(-4, 4, r), m = nz(-3, 4, r);
      const s = '(' + cf(m, 'x') + sg(a) + ')/(x' + sg(c) + ')';
      if (x + c === 0) continue;
      const val = Q(m * x + a, x + c), xs = x < 0 ? '(' + mi(x) + ')' : String(x);
      return numT('Berechne den Wert des Terms für ' + vI('x') + ' = ' + mi(x) + ':' + A(tex(s)), val,
        rw([frac((m === 1 ? '' : m === -1 ? MINUS : mi(m) + ' · ') + xs + (a < 0 ? ' − ' + -a : ' + ' + a), xs + (c < 0 ? ' − ' + -c : ' + ' + c)) + ' = ' + frac(mi(m * x + a), mi(x + c)) + ' = ' + b(qHTML(val, true)) + note('Variable in Klammern einsetzen')]), { noRoot: true });
    }
  };
  // Aufstellen: Text → Term (jede gleichwertige Form zählt)
  GEN.tmAufstellen = (r) => {
    const a = ri(2, 9, r), c = ri(2, 9, r), k = ri(2, 6, r);
    const T = [
      () => ['das Dreifache von <i>x</i>, vermindert um ' + c, '3x-' + c],
      () => ['das ' + ['Doppelte', 'Dreifache', 'Vierfache', 'Fünffache'][k % 4] + ' der Summe von <i>x</i> und ' + c, [2, 3, 4, 5][k % 4] + '(x+' + c + ')'],
      () => ['die Summe aus dem Doppelten von <i>a</i> und dem ' + ['Dreifachen', 'Vierfachen', 'Fünffachen'][k % 3] + ' von <i>b</i>', '2a+' + [3, 4, 5][k % 3] + 'b'],
      () => ['das Quadrat der Summe von <i>x</i> und ' + c, '(x+' + c + ')^2'],
      () => ['die Summe der Quadrate von <i>x</i> und ' + c, 'x^2+' + c * c],
      () => ['die Differenz aus dem Quadrat von <i>x</i> und dem ' + ['Doppelten', 'Dreifachen', 'Vierfachen'][k % 3] + ' von <i>y</i>', 'x^2-' + [2, 3, 4][k % 3] + 'y'],
      () => ['das Produkt aus der Summe und der Differenz von <i>a</i> und ' + c, '(a+' + c + ')(a-' + c + ')'],
      () => ['die Hälfte von <i>x</i>, vermehrt um ' + c, 'x/2+' + c],
      () => ['der Kehrwert von <i>x</i>, vermehrt um ' + c, '1/x+' + c],
      () => ['die Zahl, die um ' + c + ' kleiner ist als das Quadrat von <i>n</i>', 'n^2-' + c],
      () => ['Ein Rechteck ist <i>x</i> cm lang und um ' + c + ' cm schmäler als lang. Term für den <b>Umfang</b> (in cm):', '2x+2(x-' + c + ')'],
      () => ['Ein Rechteck ist <i>x</i> cm lang und um ' + c + ' cm schmäler als lang. Term für den <b>Flächeninhalt</b> (in cm²):', 'x(x-' + c + ')'],
      () => ['Die Seite eines Quadrats (<i>a</i> cm) wird um ' + c + ' cm verlängert. Term für den <b>Flächeninhalt</b> des neuen Quadrats:', '(a+' + c + ')^2'],
      () => ['Drei aufeinanderfolgende ganze Zahlen, die kleinste ist <i>n</i>. Term für ihre <b>Summe</b>:', 'n+(n+1)+(n+2)'],
      () => ['Ein Kinoticket kostet <i>x</i> €, ein Getränk <i>y</i> €. Familie Huber kauft ' + a + ' Tickets und ' + c + ' Getränke. Gesamtpreis in €:', a + 'x+' + c + 'y'],
      () => ['Anna ist <i>x</i> Jahre alt. Ihr Vater ist um ' + c + ' Jahre älter als das Dreifache von Annas Alter. Alter des Vaters:', '3x+' + c],
      () => ['Ein Handytarif kostet ' + a + ' € Grundgebühr pro Monat plus 0,1 € pro SMS. Kosten für <i>n</i> SMS in einem Monat (in €):', a + '+0,1n'],
      () => ['Max hat <i>x</i> €. Er gibt ein Drittel davon aus und bekommt dann ' + c + ' € geschenkt. Wie viel Geld hat er jetzt?', 'x-x/3+' + c],
      () => ['Ein Würfel hat die Kantenlänge <i>a</i> cm. Term für die <b>Oberfläche</b> (in cm²):', '6a^2'],
      () => ['Ein Quader ist <i>a</i> cm lang, doppelt so breit wie lang und ' + c + ' cm hoch. Term für das <b>Volumen</b> (in cm³):', 'a·2a·' + c]
    ];
    const [txt, sol] = pick(T, r)();
    const ans = poly(sol);
    return polyT('Stelle einen Term auf:' + A('<span style="font-size:.85em">' + txt + '</span>'), ans,
      rw(['z. B. ' + b(tex(sol)) + (pTerms(ans) > 0 && tex(sol) !== pHTML(ans) ? ' &nbsp;= ' + pHTML(ans) : '')]) + '<p class="hint">Jeder gleichwertige Term zählt. Zuerst den Text in Bausteine zerlegen: Wovon ist die Rede (Summe, Differenz, Produkt, Quotient, Quadrat)? Was gehört in Klammern?</p>', 'any');
  };
  GEN.tmBruchAdd = (r) => {
    const v = pick(['x', 'a'], r), p = nz(-7, 9, r), q = nz(-7, 9, r);
    if (r() < 0.5) {
      if (p + q === 0) return GEN.tmBruchAdd(r);
      const s = p + '/' + v + (q < 0 ? '-' + -q : '+' + q) + '/' + v;
      return polyT('Fasse zusammen (gleicher Nenner):' + A(tex(s)), poly(s), rw([tex(s) + ' = ' + frac(p + (q < 0 ? ' − ' + -q : ' + ' + q), vI(v)) + ' = ' + b(tex((p + q) + '/' + v)) + note('gleicher Nenner: Zähler addieren, Nenner bleibt')]) + '<p class="hint">Achtung: ' + vI(v) + ' ≠ 0, sonst ist der Term nicht definiert.</p>', 'any', { ph: 'z. B. 5/x' });
    }
    const m = pick([2, 3, 4], r), s = p + '/' + v + (q < 0 ? '-' + -q : '+' + q) + '/(' + m + v + ')';
    const tot = p * m + q; if (tot === 0) return GEN.tmBruchAdd(r);
    return polyT('Bringe auf gemeinsamen Nenner und fasse zusammen:' + A(tex(s)), poly(s),
      rw([tex(s) + ' = ' + frac(p * m + '', m + vI(v)) + (q < 0 ? ' − ' : ' + ') + frac(Math.abs(q), m + vI(v)) + note('ersten Bruch mit ' + m + ' erweitern'), '= ' + b(tex(tot + '/(' + m + v + ')')) + (gcd(BigInt(tot), BigInt(m)) > 1n ? ' = ' + pHTML(poly(s)) : '')]), 'any', { ph: 'z. B. 7/(2x)' });
  };

  /* ======================= 6 · Potenzen mit Variablen ======================= */
  const VV = ['x', 'y', 'a', 'b'];
  const mono = (c, ex) => { const s = Object.keys(ex).sort().filter(v => ex[v]).map(v => v + (ex[v] === 1 ? '' : '^' + (ex[v] < 0 ? '(' + ex[v] + ')' : ex[v]))).join(''); return (c === 1 && s ? '' : c === -1 && s ? '-' : String(c)) + s; };
  const pPar = s => (/^-/.test(s) ? '(' + s + ')' : s);
  GEN.ptMal = (r) => {
    const [u, w] = shuffle(VV, r).slice(0, 2);
    const c1 = nz(-5, 6, r), c2 = nz(-4, 5, r), e = { [u]: ri(1, 5, r), [w]: ri(1, 3, r) }, f = { [u]: ri(1, 4, r), [w]: ri(1, 3, r) };
    const s1 = mono(c1, e), s2 = mono(c2, f), str = pPar(s1) + '·' + '(' + s2 + ')';
    const ans = poly(str);
    return polyT('Vereinfache:' + A(tex(str)), ans,
      rw(['= (' + c1 + ' · ' + mi(c2) + ') · ' + vI(u) + '<sup>' + e[u] + '+' + f[u] + '</sup>' + ' · ' + vI(w) + '<sup>' + e[w] + '+' + f[w] + '</sup>' + note('Zahlen multiplizieren, Exponenten gleicher Basis addieren'), '= ' + b(pHTML(ans))]), 'expanded', { ph: 'z. B. -6a^3b^4' });
  };
  GEN.ptDiv = (r) => {
    const [u, w] = shuffle(VV, r).slice(0, 2);
    const c2 = nz(-4, 5, r), m = nz(-4, 5, r), c1 = c2 * m;
    const f = { [u]: ri(1, 3, r), [w]: ri(1, 2, r) }, res = { [u]: ri(1, 4, r), [w]: ri(-1, 2, r) };
    const e = { [u]: f[u] + res[u], [w]: f[w] + res[w] };
    const s1 = mono(c1, e), s2 = mono(c2, f), str = pPar(s1) + ':(' + s2 + ')', ans = poly(str);
    return polyT('Vereinfache:' + A(tex(str)), ans,
      rw(['= (' + mi(c1) + ' : ' + mi(c2) + ') · ' + vI(u) + '<sup>' + e[u] + '−' + f[u] + '</sup> · ' + vI(w) + '<sup>' + e[w] + '−' + f[w] + '</sup>' + note('Exponenten subtrahieren'), '= ' + b(pHTML(ans)) + (res[w] < 0 ? ' = ' + tex(mono(m, { [u]: res[u] }) + '/' + w) : res[w] === 0 ? note(vI(w) + '<sup>0</sup> = 1') : '')]), 'expanded', { ph: 'z. B. 3x^3y' });
  };
  GEN.ptPot = (r) => {
    const [u, w] = shuffle(VV, r).slice(0, 2);
    const c = pick([-3, -2, -1, 2, 3, 2, -2], r), n = pick([2, 3, 2, 4], r), e = { [u]: ri(1, 4, r), [w]: ri(1, 3, r) };
    if (Math.abs(c) ** n > 100) return GEN.ptPot(r);
    const str = '(' + mono(c, e) + ')^' + n, ans = poly(str);
    return polyT('Vereinfache:' + A(tex(str)), ans,
      rw(['= (' + mi(c) + ')<sup>' + n + '</sup> · ' + vI(u) + '<sup>' + e[u] + '·' + n + '</sup> · ' + vI(w) + '<sup>' + e[w] + '·' + n + '</sup>' + note('jeden Faktor potenzieren, Exponenten multiplizieren'), '= ' + b(pHTML(ans)) + (c < 0 ? note(n % 2 ? 'ungerader Exponent → Minus bleibt' : 'gerader Exponent → Plus') : '')]), 'expanded', { ph: 'z. B. -8x^9y^3' });
  };
  GEN.ptMix = (r) => {
    const u = pick(VV, r), c = pick([2, 3, -2], r), n = pick([2, 3], r), e = ri(2, 4, r), d = ri(1, 3, r), f = ri(1, 9, r);
    const k = pick([0, 1, 2], r);
    let str;
    if (k === 0) str = '(' + c + u + '^' + e + ')^' + n + '·' + u + '^(-' + f + ')';
    else if (k === 1) str = '(' + c + u + '^' + e + ')^' + n + ':(' + c + u + '^' + d + ')';
    else str = u + '^' + e + '·' + u + '^(-' + f + ')·' + u + '^' + d;
    const ans = poly(str);
    return polyT('Vereinfache (negative Exponenten sind erlaubt):' + A(tex(str)), ans,
      '<p>Schritt für Schritt: zuerst Klammer potenzieren (Exponenten ·), dann gleiche Basen zusammenfassen (· → Exponenten +, : → Exponenten −).</p>' + rw(['= ' + b(pHTML(ans))]) +
      '<p class="hint">' + vI('x') + '<sup>−<i>n</i></sup> = ' + frac(1, vI('x') + '<sup><i>n</i></sup>') + ' – beide Schreibweisen zählen.</p>', 'expanded', { ph: 'z. B. 8x^-3 oder 8/x^3' });
  };
  GEN.ptWert = (r) => {
    const k = pick(['negB', 'negB', 'negE', 'negE', 'frac', 'null', 'mix'], r);
    if (k === 'negB') {
      const a = ri(2, 5, r), n = ri(2, 4, r), par = r() < 0.5, v = par ? qpow(Q(-a), n) : qneg(qpow(Q(a), n));
      const s = par ? '(−' + a + ')<sup>' + n + '</sup>' : '−' + a + '<sup>' + n + '</sup>';
      return numT('Berechne:' + A(s), v, rw([s + ' = ' + (par ? '(−' + a + ')·'.repeat(n).slice(0, -1) : '−(' + (a + '·').repeat(n).slice(0, -1) + ')') + ' = ' + b(qHTML(v)) + note(par ? (n % 2 ? 'ungerade → negativ' : 'gerade → positiv') : 'Potenz kommt vor dem Minus!')]));
    }
    if (k === 'negE') { const a = ri(2, 5, r), n = ri(1, 3, r), v = qpow(Q(a), -n); return numT('Berechne:' + A(a + '<sup>−' + n + '</sup>'), v, rw([a + '<sup>−' + n + '</sup> = ' + frac(1, a + (n > 1 ? '<sup>' + n + '</sup>' : '')) + ' = ' + b(qHTML(v)) + note('negativer Exponent = Kehrwert')]) + '<p class="hint">Das Ergebnis ist positiv – der negative Exponent macht die Zahl nicht negativ.</p>'); }
    if (k === 'frac') { let p = ri(1, 4, r), q = ri(2, 5, r); if (p >= q || gcd(BigInt(p), BigInt(q)) > 1n) return GEN.ptWert(r); const n = ri(1, 2, r), v = qpow(Q(p, q), -n); return numT('Berechne:' + A('(' + frac(p, q) + ')<sup>−' + n + '</sup>'), v, rw(['(' + frac(p, q) + ')<sup>−' + n + '</sup> = (' + frac(q, p) + ')<sup>' + n + '</sup> = ' + b(qHTML(v)) + note('Bruch umdrehen, Exponent wird positiv')])); }
    if (k === 'null') { const a = pick(['5', '(−3)', '17', '(' + frac(2, 3) + ')', 'x'], r); return numT('Berechne (für ' + vI('x') + ' ≠ 0):' + A(a.replace('x', vI('x')) + '<sup>0</sup>'), ONE, rw([a.replace('x', vI('x')) + '<sup>0</sup> = ' + b(1) + note('alles (außer 0) hoch 0 ist 1')])); }
    const a = pick([2, 3], r), m = ri(3, 6, r), n = ri(1, m - 1, r), v = qpow(Q(a), m - n - 2);
    return numT('Berechne ohne Taschenrechner:' + A(frac(a + '<sup>' + m + '</sup>', a + '<sup>' + n + '</sup> · ' + a + '<sup>2</sup>')), v, rw(['= ' + a + '<sup>' + m + '−' + n + '−2</sup> = ' + a + sup(m - n - 2) + ' = ' + b(qHTML(v)) + note('erst Regeln, dann ausrechnen')]));
  };
  GEN.ptFalle = (r) => {
    const F = [
      [tex('3x^2+2x^2'), [tex('5x^2'), tex('5x^4'), tex('6x^2'), tex('6x^4')], 0, 'Beim <b>Addieren</b> bleibt der Exponent gleich – man zählt nur, wie viele x² es sind (3 + 2 = 5).'],
      [tex('3x^2·2x^2'), [tex('6x^4'), tex('5x^4'), tex('6x^2'), tex('5x^2')], 0, 'Beim <b>Multiplizieren</b>: Zahlen ·, Exponenten +.'],
      [tex('x^3+x^2'), [tex('x^3+x^2'), tex('x^5'), tex('2x^5'), tex('x^6')], 0, 'x³ und x² sind <b>nicht gleichartig</b> – man kann nichts zusammenfassen.'],
      [tex('(x^3)^2'), [tex('x^6'), tex('x^5'), tex('x^9'), tex('2x^3')], 0, 'Potenz potenzieren: Exponenten <b>multiplizieren</b> (3 · 2 = 6).'],
      [tex('x^3·x^2'), [tex('x^5'), tex('x^6'), tex('2x^5'), tex('x^3+x^2')], 0, 'Gleiche Basis multiplizieren: Exponenten <b>addieren</b>.'],
      [tex('(2a)^3'), [tex('8a^3'), tex('2a^3'), tex('6a^3'), tex('8a')], 0, 'Jeder Faktor wird potenziert: 2³ · a³ = 8a³.'],
      [tex('a^6:a^2'), [tex('a^4'), tex('a^3'), tex('a^8'), tex('a^12')], 0, 'Dividieren: Exponenten <b>subtrahieren</b> (6 − 2 = 4), nicht dividieren.']
    ];
    const [q, ch, c, w] = pick(F, r);
    return choice('Was ist richtig?' + A(q + ' = ?'), ch, c, '<p>' + w + '</p>', r);
  };

  /* ======================= 7 · Rechnen mit Termen (+ − · :) ======================= */
  function rPoly(r, v, deg, n) { // zufälliges Polynom in v als String
    const out = []; const ds = shuffle([...Array(deg + 1).keys()].reverse(), r).slice(0, n).sort((a, b) => b - a);
    ds.forEach(d => { const c = nz(-7, 8, r); out.push(d === 0 ? String(c) : cf(c, v + (d > 1 ? '^' + d : ''))); });
    return out.join('+').replace(/\+-/g, '-');
  }
  GEN.rtPlusMinus = (r) => {
    const v = pick(['x', 'a', 'y'], r), p1 = rPoly(r, v, 2, 3), p2 = rPoly(r, v, 2, 3), minus = r() < 0.75;
    const str = '(' + p1 + ')' + (minus ? '-' : '+') + '(' + p2 + ')', ans = poly(str);
    if (!pTerms(ans)) return GEN.rtPlusMinus(r);
    const neg2 = pHTML(minus ? pNeg(poly(p2)) : poly(p2));
    return polyT('Fasse zusammen:' + A(tex(str)), ans,
      rw(['= ' + tex(p1) + (neg2.startsWith(MINUS) ? ' ' + neg2.replace(MINUS, '− ') : ' + ' + neg2) + note(minus ? 'Minus vor der Klammer: alle Vorzeichen in der Klammer umdrehen!' : 'Plus vor der Klammer: Klammer einfach weglassen'), '= ' + b(pHTML(ans)) + note('gleichartige Terme zusammenfassen')]), 'expanded');
  };
  GEN.rtMono = (r) => {
    const [u, w] = shuffle(['x', 'y', 'a', 'b'], r).slice(0, 2);
    const c = nz(-5, 5, r), m = mono(c, { [u]: ri(1, 2, r) });
    const p = cf(nz(-4, 5, r), u + (r() < 0.5 ? '^2' : '')) + cfs(nz(-6, 6, r), w) + sg(nz(-9, 9, r));
    const str = pPar(m) + '(' + p + ')', ans = poly(str);
    return polyT('Multipliziere aus:' + A(tex(str)), ans, rw(['jeden Summanden in der Klammer mit ' + tex(m) + ' multiplizieren' + note('Distributivgesetz'), '= ' + b(pHTML(ans))]) + (c < 0 ? '<p class="hint">Minus vor dem Faktor → jedes Vorzeichen in der Klammer dreht sich um.</p>' : ''), 'expanded');
  };
  GEN.rtPoly = (r) => {
    const k = pick([0, 0, 1, 1, 2], r);
    let str;
    if (k === 0) str = '(' + cf(nz(-3, 4, r), 'x') + sg(nz(-7, 7, r)) + ')(' + cf(nz(-3, 4, r), 'x') + sg(nz(-7, 7, r)) + ')';
    else if (k === 1) str = '(' + cf(nz(-3, 3, r), 'a') + cfs(nz(-4, 4, r), 'b') + ')(' + cf(nz(-3, 3, r), 'a') + cfs(nz(-4, 4, r), 'b') + ')';
    else str = '(x' + sg(nz(-3, 3, r)) + ')(x^2' + cfs(nz(-3, 3, r), 'x') + sg(nz(-4, 4, r)) + ')';
    const ans = poly(str);
    return polyT('Multipliziere aus und fasse zusammen:' + A(tex(str)), ans,
      rw(['„Jedes Glied mit jedem“: ' + (k === 2 ? '2 · 3 = 6 Produkte' : '2 · 2 = 4 Produkte'), '= ' + b(pHTML(ans)) + note('danach gleichartige Terme zusammenfassen')]) + '<p class="hint">Probe-Trick: setze z. B. x = 1 in Angabe und Ergebnis ein – es muss dasselbe herauskommen.</p>', 'expanded');
  };
  GEN.rtDiv = (r) => {
    const v = pick(['x', 'a'], r), c = pick([2, 3, 4, 5, -2, -3], r), e = ri(1, 2, r), d = c + v + (e > 1 ? '^' + e : '');
    const q = rPoly(r, v, 2, 3), num = pMul(poly(q), poly(d));
    const str = '(' + pStr(num) + '):(' + d + ')';
    const ans = poly(str);
    return polyT('Dividiere:' + A(tex(str)), ans, rw(['jedes Glied einzeln durch ' + tex(d) + ' dividieren' + note('Zahlen dividieren, Exponenten subtrahieren'), '= ' + b(pHTML(ans))]), 'expanded', { ph: 'z. B. 3x^2-2x+1' });
  };
  GEN.rtHeraus = (r) => {
    for (let g = 0; g < 100; g++) {
      const v = pick(['x', 'a'], r), c = pick([2, 3, 4, 5, 6], r), e = ri(0, 2, r);
      const f = c + (e ? v + (e > 1 ? '^' + e : '') : '');
      let inner = rPoly(r, v, 2, pick([2, 3], r)), ip = poly(inner);
      if (/^-/.test(pStr(ip))) { ip = pNeg(ip); }
      inner = pStr(ip);
      if (!pContentTrivial(ip)) continue;
      const full = pMul(ip, poly(f));
      return polyT('Hebe den größtmöglichen gemeinsamen Faktor heraus:' + A(pHTML(full)), full,
        rw(['gemeinsam: größter Teiler der Zahlen (' + c + ')' + (e ? ' und die kleinste Potenz von ' + vI(v) + ' (' + tex(v + (e > 1 ? '^' + e : '')) + ')' : ''), '= ' + b(tex(f + '(' + inner + ')')) + note('Probe: wieder ausmultiplizieren')]), 'factored', { show: tex(f + '(' + inner + ')'), ph: 'z. B. 3x(2x-3)', fullContent: true });
    }
  };
  GEN.rtMix = (r) => {
    const a = nz(-4, 5, r), c = nz(-4, 4, r), m = nz(-3, 3, r), n = nz(-4, 4, r);
    const str = pick([
      a + '(x' + sg(c) + ')-' + Math.abs(m) + '(x' + sg(n) + ')',
      'x(x' + sg(c) + ')-(x' + sg(n) + ')(x' + sg(a) + ')',
      '2x(3x' + sg(c) + ')-(x' + sg(n) + ')^2',
      '(x' + sg(a) + ')(x' + sg(c) + ')-x^2'
    ], r).replace(/^1\(/, '(');
    const ans = poly(str);
    return polyT('Vereinfache so weit wie möglich:' + A(tex(str)), ans, rw(['1. Klammern ausmultiplizieren (Ergebnis vom Minus-Teil zuerst in Klammer schreiben!)', '2. Minus vor der Klammer auflösen', '3. zusammenfassen: = ' + b(pHTML(ans))]), 'expanded');
  };
  GEN.rtKuerzen = (r) => {
    const k = pick([0, 1, 2], r);
    let str, ansS, sol;
    if (k === 0) { const c = pick([2, 3, 4, 5], r), a = nz(-6, 6, r); str = '(' + c + 'x' + sg(c * a) + ')/' + c; ansS = 'x' + sg(a); sol = [tex(str) + ' = ' + frac(c + '(' + tex('x' + sg(a)) + ')', c) + note('im Zähler ' + c + ' herausheben'), '= ' + b(tex(ansS)) + note('erst kürzen, wenn ein Produkt dasteht!')]; }
    else if (k === 1) { const a = ri(1, 9, r), s = pick([1, -1], r); str = '(x^2-' + a * a + ')/(x' + sg(s * a) + ')'; ansS = 'x' + sg(-s * a); sol = [tex(str) + ' = ' + frac('(x + ' + a + ')(x − ' + a + ')', tex('x' + sg(s * a))) + note('3. binomische Formel'), '= ' + b(tex(ansS))]; }
    else { const a = ri(1, 6, r); str = '(x^2+' + 2 * a + 'x+' + a * a + ')/(x+' + a + ')'; ansS = 'x+' + a; sol = [tex(str) + ' = ' + frac('(x + ' + a + ')<sup>2</sup>', 'x + ' + a) + note('1. binomische Formel rückwärts'), '= ' + b(tex(ansS))]; }
    return polyT('Kürze den Bruchterm:' + A(tex(str)), poly(ansS), rw(sol) + '<p class="hint">Aus Summen darf man nicht kürzen! Erst faktorisieren (herausheben oder binomische Formel), dann gleiche Faktoren kürzen.</p>', 'expanded');
  };

  /* ======================= 8 · Binomische Formeln ======================= */
  function binom(r, twoVar) {
    let p, q; do { p = pick([1, 1, 2, 3, 4, 5], r); q = ri(1, twoVar ? 5 : 9, r); } while (gcd(BigInt(p), BigInt(q)) > 1n); const u = 'x', w = twoVar ? pick(['y', 'b'], r) : '';
    const A1 = cf(p, u), B1 = (q === 1 && w ? '' : q) + w;
    return { A1, B1, p, q, u, w };
  }
  GEN.bfAus = (r) => {
    const t = binom(r, r() < 0.4), k = pick(['+', '-', 'pm', '+', '-'], r);
    const { A1, B1 } = t;
    const str = k === 'pm' ? '(' + A1 + '+' + B1 + ')(' + A1 + '-' + B1 + ')' : '(' + A1 + k + B1 + ')^2';
    const ans = poly(str);
    const Ah = tex(A1), Bh = tex(B1), Ap = A1.length > 1 ? '(' + Ah + ')' : Ah, Bp = B1.length > 1 ? '(' + Bh + ')' : Bh;
    const name = k === '+' ? '1. binomische Formel: (a + b)² = a² + 2ab + b²' : k === '-' ? '2. binomische Formel: (a − b)² = a² − 2ab + b²' : '3. binomische Formel: (a + b)(a − b) = a² − b²';
    const l1 = k === 'pm' ? Ap + '<sup>2</sup> − ' + Bp + '<sup>2</sup>' : Ap + '<sup>2</sup> ' + (k === '+' ? '+' : '−') + ' 2 · ' + Ah + ' · ' + Bh + ' + ' + Bp + '<sup>2</sup>';
    return polyT('Multipliziere mit einer binomischen Formel aus:' + A(tex(str)), ans, rw([name, 'a = ' + Ah + ', b = ' + Bh, '= ' + l1, '= ' + b(pHTML(ans))]) + (k !== 'pm' ? '<p class="hint">Das Mittelglied 2ab nicht vergessen!</p>' : ''), 'expanded');
  };
  GEN.bfFaktor = (r) => {
    const t = binom(r, r() < 0.3), k = pick(['+', '-', 'pm'], r), { A1, B1 } = t;
    const fac = k === 'pm' ? '(' + A1 + '+' + B1 + ')(' + A1 + '-' + B1 + ')' : '(' + A1 + k + B1 + ')^2';
    const ans = poly(fac);
    const Ah = tex(A1), Bh = tex(B1);
    return polyT('Schreibe als Produkt (binomische Formel rückwärts):' + A(pHTML(ans)), ans,
      rw([k === 'pm' ? 'Differenz zweier Quadrate → 3. Formel' : 'drei Glieder, außen Quadrate → 1. oder 2. Formel',
        'a² = ' + pHTML(poly('(' + A1 + ')^2')) + ' → a = ' + Ah + ', &nbsp;b² = ' + pHTML(poly('(' + B1 + ')^2')) + ' → b = ' + Bh,
        k === 'pm' ? '' : 'Probe Mittelglied: 2 · ' + Ah + ' · ' + Bh + ' = ' + pHTML(poly('2·' + A1 + '·' + B1)) + ' ✓',
        '= ' + b(tex(fac))].filter(Boolean)), 'factored', { show: tex(fac), ph: 'z. B. (3x-2)^2' });
  };
  GEN.bfLuecke = (r) => {
    const t = binom(r, false), k = pick(['+', '-'], r), { A1, B1 } = t;
    const full = poly('(' + A1 + k + B1 + ')^2'), mid = pHTML(poly('2·' + A1 + '·' + B1)), sq = pHTML(poly('(' + B1 + ')^2')), aa = pHTML(poly('(' + A1 + ')^2'));
    const which = pick(['mid', 'b', 'a'], r);
    let prompt, ans;
    if (which === 'mid') { prompt = '(' + tex(A1) + ' ' + k.replace('-', '−') + ' ' + tex(B1) + ')<sup>2</sup> = ' + aa + ' ' + k.replace('-', '−') + ' ▢ + ' + sq; ans = poly('2·' + A1 + '·' + B1); }
    else if (which === 'b') { prompt = '(' + tex(A1) + ' ' + k.replace('-', '−') + ' ▢)<sup>2</sup> = ' + pHTML(full); ans = poly(B1); }
    else { prompt = '(▢ ' + k.replace('-', '−') + ' ' + tex(B1) + ')<sup>2</sup> = ' + pHTML(full); ans = poly(A1); }
    return polyT('Was gehört in das Kästchen ▢?' + A(prompt), ans, rw(['(a ± b)² = a² ± 2ab + b²', 'a = ' + tex(A1) + ', b = ' + tex(B1) + ', 2ab = ' + mid, '▢ = ' + b(pHTML(ans))]), 'any', { ph: 'nur den fehlenden Term' });
  };
  GEN.bfKopf = (r) => {
    if (r() < 0.5) {
      const base = pick([20, 30, 40, 50, 60, 70, 80, 100], r), d = pick([1, 2, 3, -1, -2], r), n = base + d;
      return numT('Rechne im Kopf mit einer binomischen Formel:' + A(n + '<sup>2</sup>'), Q(n * n), rw([n + '² = (' + base + (d < 0 ? ' − ' + -d : ' + ' + d) + ')² = ' + base * base + (d < 0 ? ' − ' : ' + ') + 2 * base * Math.abs(d) + ' + ' + d * d + ' = ' + b(n * n)]), { noRoot: true });
    }
    const base = pick([20, 30, 40, 50, 60, 100], r), d = ri(1, 4, r);
    return numT('Rechne im Kopf mit einer binomischen Formel:' + A((base + d) + ' · ' + (base - d)), Q(base * base - d * d), rw([(base + d) + ' · ' + (base - d) + ' = (' + base + ' + ' + d + ')(' + base + ' − ' + d + ') = ' + base * base + ' − ' + d * d + ' = ' + b(base * base - d * d) + note('3. binomische Formel')]), { noRoot: true });
  };
  GEN.bfMix = (r) => {
    const a = ri(1, 5, r), c = ri(1, 5, r), p = pick([1, 2, 3], r);
    const X = cf(p, 'x');
    const str = pick([
      '(' + X + '+' + a + ')^2-(' + X + '-' + a + ')^2',
      '(' + X + '-' + a + ')^2-(' + X + '+' + a + ')(' + X + '-' + a + ')',
      '(x+' + a + ')^2+(x-' + c + ')^2',
      '2(x-' + a + ')^2-(x+' + c + ')(x-' + c + ')'
    ], r);
    const ans = poly(str);
    return polyT('Vereinfache:' + A(tex(str)), ans, rw(['1. jede binomische Formel einzeln ausrechnen und <b>in Klammern</b> schreiben', '2. Minus vor der Klammer: Vorzeichen umdrehen', '3. zusammenfassen: = ' + b(pHTML(ans))]), 'expanded');
  };
  GEN.bfFalle = (r) => {
    const a = ri(2, 6, r);
    const F = [
      [tex('(x+' + a + ')^2'), [tex('x^2+' + 2 * a + 'x+' + a * a), tex('x^2+' + a * a), tex('x^2+' + a + 'x+' + a * a), tex('2x+' + 2 * a)], 0, 'Das Mittelglied 2ab fehlt bei x² + ' + a * a + ' – der häufigste Fehler!'],
      [tex('(x-' + a + ')^2'), [tex('x^2-' + 2 * a + 'x+' + a * a), tex('x^2-' + a * a), tex('x^2-' + 2 * a + 'x-' + a * a), tex('x^2+' + 2 * a + 'x-' + a * a)], 0, 'Auch bei der 2. Formel ist b² immer <b>plus</b>: (−' + a + ')² = +' + a * a + '.'],
      [tex('(x+' + a + ')(x-' + a + ')'), [tex('x^2-' + a * a), tex('x^2+' + a * a), tex('x^2-' + 2 * a + 'x-' + a * a), tex('x^2-' + 2 * a + 'x+' + a * a)], 0, 'Bei (a + b)(a − b) heben sich die Mittelglieder auf: a² − b².'],
      [tex('(-x-' + a + ')^2'), [tex('x^2+' + 2 * a + 'x+' + a * a), tex('-x^2-' + 2 * a + 'x-' + a * a), tex('x^2-' + 2 * a + 'x+' + a * a), tex('-x^2+' + a * a)], 0, '(−x − ' + a + ')² = (x + ' + a + ')², weil (−1)² = 1.']
    ];
    const [q, ch, c, w] = pick(F, r);
    return choice('Was ist richtig?' + A(q + ' = ?'), ch, c, '<p>' + w + '</p>', r);
  };

  /* ======================= API ======================= */
  function make(spec, r) { const t = GEN[spec.kind](r, spec); t.kind = spec.kind; if (!t.ph) t.ph = 'Antwort'; return t; }
  // Summanden auf oberster Ebene, je mit Variablen-Vorkommen
  function topSummands(a) { if (a.t === 'sum') return a.items.map(i => i.x); return [a]; }
  function varCount(a, m) {
    m = m || {};
    if (a.t === 'v') m[a.n] = (m[a.n] || 0) + 1;
    ['x', 'b'].forEach(k => { if (a[k] && typeof a[k] === 'object') varCount(a[k], m); });
    if (a.items) a.items.forEach(i => varCount(i.x, m));
    return m;
  }
  function hasNode(a, test) { if (test(a)) return true; return ['x', 'b'].some(k => a[k] && typeof a[k] === 'object' && hasNode(a[k], test)) || (a.items || []).some(i => hasNode(i.x, test)); }
  const FORMAT = {
    num: 'Beispiele: <b>-12</b> · <b>0,25</b> · <b>3/4</b>',
    surd: 'Wurzel mit <b>√</b>-Knopf oder „w“: z. B. <b>3√5</b>, <b>2+3√2</b>, <b>-√7</b>',
    poly: 'Beispiele: <b>4x^2-12x+9</b> · <b>-6a^3b^4</b> · <b>(3x-2)^2</b>',
    interval: 'Schreib z. B. <b>]2; 5]</b> oder <b>[-1; ∞[</b> – Grenzen mit Strichpunkt trennen',
    list: 'Zahlen mit Strichpunkt trennen, z. B. <b>-3; 3</b> – oder <b>keine</b>'
  };
  function check(task, input) {
    if (task.mode === 'choice') return { ok: Number(input) === task.correct };
    if (task.mode === 'multi') { const s = (input || []).map(Number).sort(); return { ok: s.length === task.correct.length && s.every((x, j) => x === task.correct[j]) }; }
    const raw = String(input == null ? '' : input).trim();
    if (!raw) return { invalid: true, msg: 'Bitte zuerst eine Antwort eingeben.' };
    const bad = { invalid: true, msg: 'Das kann ich nicht lesen. ' + FORMAT[task.mode] };
    if (task.mode === 'interval') {
      let I; try { I = parseInterval(raw); } catch (e) { return bad; }
      if (I.infClosed) return { invalid: true, msg: 'Bei <b>∞</b> ist die Klammer immer <b>offen</b> (∞ ist keine Zahl, die dazugehören kann): z. B. <b>[3; ∞[</b>.' };
      return { ok: ivEq(I, task.ans) };
    }
    if (task.mode === 'list') {
      if (/^\s*(keine|nichts|-|leer|∅|\{\s*\})\s*$/i.test(raw)) return { ok: task.ans.length === 0 };
      let L; try { L = parseList(raw); } catch (e) { return bad; }
      const u = []; L.forEach(q => { if (!u.some(x => qeq(x, q))) u.push(q); });
      return { ok: u.length === task.ans.length && u.every(q => task.ans.some(x => qeq(x, q))) };
    }
    let ast; try { ast = parse(raw); } catch (e) { return bad; }
    if (task.mode === 'poly') {
      let P; try { P = evalP(ast); } catch (e) { return bad; }
      if (!pEq(P, task.ans)) return { ok: false };
      const flat = norm(raw).replace(/\^\(\s*-?\d+\s*\)/g, '');
      if (task.form === 'expanded') {
        if (/[()]/.test(flat)) return { invalid: true, msg: 'Der Wert stimmt – aber bitte <b>ohne Klammern</b> schreiben, also ganz ausmultipliziert und zusammengefasst.' };
        const sm = topSummands(ast);
        if (sm.length !== pTerms(task.ans) || sm.some(s => Object.values(varCount(s)).some(c => c > 1))) return { invalid: true, msg: 'Der Wert stimmt – aber du kannst noch <b>zusammenfassen</b> (gleichartige Glieder bzw. gleiche Variablen).' };
      }
      if (task.form === 'factored') {
        const top = ast.t === 'neg' ? ast.x : ast;
        if (top.t === 'sum' || !hasNode(top, n => n.t === 'par')) return { invalid: true, msg: 'Der Wert stimmt – aber gesucht ist ein <b>Produkt</b> (mit Klammern), z. B. 3x(2x − 1) oder (x + 3)².' };
        if (task.fullContent) {
          const pars = []; (function walk(a) { if (a.t === 'par') pars.push(a.x); ['x', 'b'].forEach(k => a[k] && typeof a[k] === 'object' && walk(a[k])); (a.items || []).forEach(i => walk(i.x)); })(top);
          if (pars.some(p => !pContentTrivial(evalP(p)))) return { invalid: true, msg: 'Richtig umgeformt – aber in der Klammer steckt noch ein gemeinsamer Faktor. Heb den <b>größtmöglichen</b> Faktor heraus.' };
        }
      }
      return { ok: true };
    }
    let S; try { S = evalS(ast); } catch (e) { return bad; }
    if (task.mode === 'num') {
      if (!sIsRat(S)) return { ok: false };
      if (!qeq(sRat(S), task.ans)) return { ok: false };
      if (task.noRoot && /√/.test(norm(raw))) return { invalid: true, msg: 'Der Wert stimmt – aber bitte das Ergebnis <b>ohne Wurzelzeichen</b> angeben.' };
      return { ok: true };
    }
    if (task.mode === 'surd') {
      if (!sEq(S, task.ans)) return { ok: false };
      if (task.simplified) {
        const rs = []; let okForm = true;
        (function walk(a) {
          if (a.t === 'sqrt') { let x = a.x.t === 'par' ? a.x.x : a.x; if (x.t !== 'n' || !isInt(x.v)) okForm = false; else { const { k } = sqf(x.v.n); if (k !== 1n || x.v.n < 2n) okForm = false; rs.push(x.v.n.toString()); } return; }
          ['x', 'b'].forEach(k => a[k] && typeof a[k] === 'object' && walk(a[k])); (a.items || []).forEach(i => walk(i.x));
        })(ast);
        if (!okForm) return { invalid: true, msg: 'Der Wert stimmt – aber unter der Wurzel steckt noch eine Quadratzahl. Zieh die Wurzel <b>so weit wie möglich</b>.' };
        if (new Set(rs).size !== rs.length) return { invalid: true, msg: 'Der Wert stimmt – aber du kannst gleiche Wurzeln noch <b>zusammenfassen</b>.' };
      }
      return { ok: true };
    }
    return bad;
  }
  // Vorschau "Ich lese:" für die Eingabe
  function preview(task, raw) {
    if (!raw.trim()) return '';
    if (task.mode === 'interval') { const I = parseInterval(raw); return I.infClosed ? '…' : ivHTML(I); }
    if (task.mode === 'list') { if (/^\s*keine\s*$/i.test(raw)) return 'keine Zahl'; return parseList(raw).map(q => qHTML(q, true)).join('; '); }
    return aHTML(parse(raw));
  }

  const api = {
    pStr, Q, D, qadd, qsub, qmul, qdiv, qeq, qHTML, sqf, surd, sHTML, sEq, sQ, sAdd, sMul, poly, pHTML, pEq, pAdd, pMul, pSub, pTerms,
    parse, evalP, evalS, aHTML, tex, rad, frac, parseInterval, ivHTML, ivSet, ivEq, parseList, zahlenstrahl,
    rng, make, check, preview, GEN
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Terme = api;
})(typeof window !== 'undefined' ? window : globalThis);
