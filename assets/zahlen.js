/* zahlen.js – Rechen-Engine für Zahlensysteme.
   Umwandeln, Rechenwege als HTML, Aufgaben-Generatoren.
   Läuft im Browser (window.Zahlen) und in Node (module.exports) zum Testen. */
(function (root) {
  'use strict';

  const SYM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // ---------- Grundfunktionen ----------
  function digits(n, b) {
    if (n === 0) return [0];
    const d = [];
    while (n > 0) { d.unshift(n % b); n = Math.floor(n / b); }
    return d;
  }
  function sym(d, b) { return b <= 36 ? SYM[d] : '(' + d + ')'; }
  function fmtDigits(ds, b) { return ds.map(d => sym(d, b)).join(''); }
  function fmt(n, b) { return fmtDigits(digits(n, b), b); }
  function value(ds, b) { return ds.reduce((a, d) => a * b + d, 0); }
  function name(b) { return b === 2 ? 'Binärsystem' : b === 8 ? 'Oktalsystem' : b === 10 ? 'Dezimalsystem' : b === 16 ? 'Hexadezimalsystem' : b + 'er-System'; }
  function maxSym(b) { return b <= 36 ? SYM[b - 1] : String(b - 1); }

  /* Eingabe lesen. Erlaubt: "2a3", "1011 0101", "(1)(23)(7)", bei Basis > 36 auch "1 23 7". */
  function parse(str, b) {
    let s = String(str == null ? '' : str).trim().toUpperCase().replace(/[_\s]+/g, ' ');
    if (!s) return { ok: false, error: 'Bitte eine Zahl eingeben.' };
    let ds = [];
    if (s.includes('(')) {
      const groups = s.match(/\(\s*\d+\s*\)|[0-9A-Z]/g) || [];
      if (groups.join('').replace(/\s/g, '') !== s.replace(/\s/g, '')) return { ok: false, error: 'Schreibweise: Ziffern ab 10 in Klammern, z. B. (12)(3)(45).' };
      ds = groups.map(g => g[0] === '(' ? parseInt(g.replace(/[()\s]/g, ''), 10) : SYM.indexOf(g));
    } else if (b > 36) {
      const parts = s.split(/[ .,|]+/).filter(Boolean);
      if (!parts.every(p => /^\d+$/.test(p))) return { ok: false, error: 'Bei Basis ' + b + ': Ziffern in Klammern schreiben, z. B. (1)(23)(7).' };
      ds = parts.map(Number);
    } else {
      for (const c of s.replace(/ /g, '')) {
        const d = SYM.indexOf(c);
        if (d < 0) return { ok: false, error: '„' + c + '“ ist keine Ziffer.' };
        ds.push(d);
      }
    }
    for (const d of ds) {
      if (d >= b) return { ok: false, badDigit: d, error: 'Die Ziffer ' + (d < 36 ? SYM[d] : '(' + d + ')') + ' gibt es im ' + name(b) + ' nicht – erlaubt sind nur 0 bis ' + maxSym(b) + '.' };
    }
    while (ds.length > 1 && ds[0] === 0) ds.shift();
    return { ok: true, digits: ds, value: value(ds, b) };
  }

  // ---------- Darstellung ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function num(n, b) { return '<span class="n">' + esc(fmt(n, b)) + '<sub>' + b + '</sub></span>'; }
  function numStr(s, b) { return '<span class="n">' + esc(s) + '<sub>' + b + '</sub></span>'; }
  function pow(b, i) { return i === 0 ? '1' : b + '<sup>' + i + '</sup>'; }
  function letterNote(d, b) { return (b > 10 && b <= 36 && d >= 10) ? ' <span class="muted">(' + SYM[d] + ' = ' + d + ')</span>' : ''; }

  // ---------- Rechenwege ----------
  /* Beliebige Basis → Dezimal (Stellenwert-Methode) */
  function stepsToDec(ds, b) {
    const n = ds.length;
    let h = '<div class="scroll"><table class="calc"><tr><th>Stelle</th>';
    ds.forEach((_, i) => { h += '<td>' + (n - 1 - i) + '</td>'; });
    h += '</tr><tr><th>Ziffer</th>';
    ds.forEach(d => { h += '<td class="dg">' + sym(d, b) + (b > 10 && b <= 36 && d >= 10 ? '<small> =' + d + '</small>' : '') + '</td>'; });
    h += '</tr><tr><th>Stellenwert</th>';
    ds.forEach((_, i) => { const e = n - 1 - i; h += '<td>' + pow(b, e) + (e > 1 ? ' = ' + Math.pow(b, e) : e === 1 ? '' : '') + '</td>'; });
    h += '</tr><tr><th>Ziffer × Stellenwert</th>';
    const prods = ds.map((d, i) => d * Math.pow(b, n - 1 - i));
    ds.forEach((d, i) => { h += '<td>' + d + ' · ' + Math.pow(b, n - 1 - i) + ' = <b>' + prods[i] + '</b></td>'; });
    h += '</tr></table></div>';
    const used = prods.filter(p => p > 0);
    h += '<p class="sum">Summe: ' + (used.length ? used.join(' + ') : '0') + ' = <b>' + value(ds, b) + '</b><sub>10</sub></p>';
    return h;
  }

  /* Dezimal → beliebige Basis (Divisions-Rest-Methode) */
  function stepsFromDec(n, b) {
    if (n === 0) return '<p>0 ist in jedem System 0.</p>';
    let h = '<div class="scroll"><table class="calc div"><tr><th>Rechnung</th><th>Ergebnis</th><th>Rest</th><th></th></tr>';
    let q = n;
    const rests = [];
    while (q > 0) {
      const r = q % b, nq = Math.floor(q / b);
      rests.push(r);
      h += '<tr><td>' + q + ' : ' + b + '</td><td>= ' + nq + '</td><td>Rest <b>' + r + '</b>' + letterNote(r, b) + '</td><td class="dg">' + sym(r, b) + '</td></tr>';
      q = nq;
    }
    h += '</table></div>';
    h += '<p class="sum">Reste <b>von unten nach oben</b> lesen: ' + num(n, b) + '</p>';
    return h;
  }

  /* Binär → Hex (k=4) / Oktal (k=3): Bündeln von rechts */
  function stepsGroup(bits, k) {
    const pad = (k - bits.length % k) % k;
    const p = '0'.repeat(pad) + bits;
    const tb = k === 4 ? 16 : 8;
    const w = k === 4 ? [8, 4, 2, 1] : [4, 2, 1];
    let h = '<p>Von <b>rechts</b> in ' + k + 'er-Bündel teilen' + (pad ? ', links ' + pad + '× 0 auffüllen' : '') + '. Jedes Bündel mit ' + w.join('-') + ' ausrechnen:</p>';
    h += '<div class="groups">';
    for (let i = 0; i < p.length; i += k) {
      const g = p.slice(i, i + k), v = parseInt(g, 2);
      const parts = g.split('').map((c, j) => c === '1' ? w[j] : 0).filter(x => x);
      h += '<div class="grp"><div class="bits">' + g + '</div><div class="calcline">' + (parts.length ? parts.join('+') : '0') + ' = ' + v + '</div><div class="dg">' + SYM[v] + '</div></div>';
    }
    h += '</div><p class="sum">Ergebnis: ' + numStr(fmt(parseInt(bits, 2), tb), tb) + '</p>';
    return h;
  }

  /* Hex/Oktal → Binär: jede Ziffer wird ein Bündel */
  function stepsUngroup(ds, k) {
    const sb = k === 4 ? 16 : 8;
    let h = '<p>Jede Ziffer einzeln in ' + k + ' Bit verwandeln (' + (k === 4 ? '8-4-2-1' : '4-2-1') + '):</p><div class="groups">';
    ds.forEach(d => {
      h += '<div class="grp"><div class="dg">' + SYM[d] + '</div><div class="calcline">' + d + '</div><div class="bits">' + d.toString(2).padStart(k, '0') + '</div></div>';
    });
    const v = value(ds, sb);
    h += '</div><p class="sum">Zusammenschreiben (führende Nullen dürfen weg): ' + num(v, 2) + '</p>';
    return h;
  }

  /* Spalten-Tabelle für + und − */
  function colTable(rows, width) {
    let h = '<table class="col">';
    rows.forEach(r => {
      h += '<tr class="' + (r.cls || '') + '"><th>' + (r.op || '') + '</th>';
      const cells = r.cells.slice();
      while (cells.length < width) cells.unshift('');
      cells.forEach(c => { h += '<td>' + c + '</td>'; });
      h += '</tr>';
    });
    return h + '</table>';
  }

  function addCore(A, B, b) {
    const a = A.slice().reverse(), c = B.slice().reverse();
    const len = Math.max(a.length, c.length);
    const res = [], carries = [0], lines = [];
    let carry = 0;
    for (let i = 0; i < len; i++) {
      const x = a[i] || 0, y = c[i] || 0, s = x + y + carry;
      const parts = [x, y].concat(carry ? [carry] : []);
      let line = '<b>Spalte ' + (i + 1) + ':</b> ' + parts.join(' + ') + ' = ' + s;
      if (s >= b) { line += ' ≥ ' + b + ' → schreibe ' + s + ' − ' + b + ' = ' + (s - b) + (b > 10 && b <= 36 && s - b >= 10 ? ' (' + SYM[s - b] + ')' : '') + ', <b>Übertrag 1</b>'; res.push(s - b); carry = 1; }
      else { line += ' &lt; ' + b + ' → schreibe ' + sym(s, b) + (b > 10 && b <= 36 && s >= 10 ? ' (' + s + ')' : ''); res.push(s); carry = 0; }
      lines.push(line);
      carries.push(carry);
    }
    if (carry) { res.push(1); lines.push('<b>Ganz links:</b> Übertrag 1 bleibt übrig → vorne hinschreiben'); }
    return { res: res.reverse(), carries, lines };
  }

  function stepsAdd(A, B, b) {
    const { res, carries, lines } = addCore(A, B, b);
    const w = res.length;
    const cr = carries.slice(0, w).map(c => c ? '<small>1</small>' : '').reverse();
    let h = '<p class="muted">Ziffern in Gedanken als Dezimalzahl addieren' + (b > 10 && b <= 36 ? ' (A=10, B=11, …)' : '') + '. Übertrag, sobald die Summe ≥ ' + b + ' ist.</p>';
    h += colTable([
      { cells: A.map(d => sym(d, b)) },
      { op: '+', cells: B.map(d => sym(d, b)) },
      { op: 'Ü', cls: 'carry', cells: cr },
      { cls: 'res', cells: res.map(d => sym(d, b)) }
    ], w);
    h += '<ol class="lines">' + lines.map(l => '<li>' + l + '</li>').join('') + '</ol>';
    h += '<p class="sum">Ergebnis: ' + numStr(fmtDigits(res, b), b) + ' <span class="muted">· Probe dezimal: ' + value(A, b) + ' + ' + value(B, b) + ' = ' + value(res, b) + '</span></p>';
    return { html: h, digits: res };
  }

  /* Subtraktion mit Übertrag (österr. Ergänzungs-Schema: Übertrag kommt zur unteren Ziffer der nächsten Spalte) */
  function stepsSub(A, B, b) {
    const a = A.slice().reverse(), c = B.slice().reverse();
    const res = [], carries = [0], lines = [];
    let carry = 0;
    for (let i = 0; i < a.length; i++) {
      const x = a[i], y = (c[i] || 0) + carry;
      const yTxt = carry ? '(' + (c[i] || 0) + ' + 1)' : String(y);
      let line = '<b>Spalte ' + (i + 1) + ':</b> ';
      if (x >= y) { line += x + ' − ' + yTxt + ' = ' + (x - y); res.push(x - y); carry = 0; }
      else { line += x + ' − ' + yTxt + ' geht nicht → (' + x + ' + ' + b + ') − ' + y + ' = ' + (x + b - y) + (b > 10 && b <= 36 && x + b - y >= 10 ? ' (' + SYM[x + b - y] + ')' : '') + ', <b>Übertrag 1</b>'; res.push(x + b - y); carry = 1; }
      lines.push(line);
      carries.push(carry);
    }
    while (res.length > 1 && res[res.length - 1] === 0) res.pop();
    const out = res.slice().reverse();
    const w = A.length;
    const cr = carries.slice(0, w).map(c => c ? '<small>1</small>' : '').reverse();
    let h = '<p class="muted">Ist oben zu klein, rechnest du oben + ' + b + ' und schreibst den Übertrag 1 zur <b>unteren</b> Ziffer der nächsten Spalte.</p>';
    h += colTable([
      { cells: A.map(d => sym(d, b)) },
      { op: '−', cells: B.map(d => sym(d, b)) },
      { op: 'Ü', cls: 'carry', cells: cr },
      { cls: 'res', cells: out.map(d => sym(d, b)) }
    ], w);
    h += '<ol class="lines">' + lines.map(l => '<li>' + l + '</li>').join('') + '</ol>';
    h += '<p class="sum">Ergebnis: ' + numStr(fmtDigits(out, b), b) + ' <span class="muted">· Probe dezimal: ' + value(A, b) + ' − ' + value(B, b) + ' = ' + value(out, b) + '</span></p>';
    return { html: h, digits: out };
  }

  // ---------- Zufall ----------
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function int(r, lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }

  const FREMD = [3, 4, 5, 6, 7, 9, 12, 20, 32, 50, 60];
  function range(b) {
    if (b === 2) return [9, 255];
    if (b === 8) return [20, 1500];
    if (b === 16) return [30, 4000];
    if (b === 10) return [10, 999];
    if (b <= 10) return [b + 1, Math.min(Math.pow(b, b <= 4 ? 5 : 4) - 1, 2000)];
    return [b + 1, Math.min(Math.pow(b, 3) - 1, 9999)];
  }
  function baseOf(r, spec) {
    if (typeof spec === 'number') return spec;
    if (spec === 'fremd') return pick(r, FREMD);
    if (Array.isArray(spec)) return pick(r, spec);
    return pick(r, [2, 8, 16]);
  }
  function hint(b) {
    if (b > 36) return '<p class="hint">Tipp: Ziffern ab 10 in Klammern schreiben, z. B. (1)(23)(7).</p>';
    if (b > 16) return '<p class="hint">Ziffern ab 10 als Buchstaben: A=10, B=11, … ' + SYM[b - 1] + '=' + (b - 1) + '.</p>';
    return '';
  }
  function column(A, B, b, op) {
    const w = Math.max(A.length, B.length) + 1;
    return '<div class="prompt-col">' + colTable([{ cells: A.map(d => sym(d, b)) }, { op: op, cells: B.map(d => sym(d, b)) }, { cls: 'res', cells: Array(w).fill('') }], w) + '<span class="muted">im ' + name(b) + '</span></div>';
  }

  /* Ein Task: { kind, prompt, answerBase | choices, answer, solution, label } */
  const GEN = {
    toDec(r, o) {
      const b = baseOf(r, o.base), [lo, hi] = range(b), n = int(r, lo, hi);
      return { kind: 'toDec', label: 'Basis ' + b + ' → dezimal', prompt: 'Wandle ins <b>Dezimalsystem</b> um: ' + num(n, b), answerBase: 10, answer: n, solution: stepsToDec(digits(n, b), b) };
    },
    fromDec(r, o) {
      const b = baseOf(r, o.base), [lo, hi] = range(b), n = int(r, lo, hi);
      return { kind: 'fromDec', label: 'dezimal → Basis ' + b, prompt: 'Wandle ' + num(n, 10) + ' ins <b>' + name(b) + '</b> um.' + hint(b), answerBase: b, answer: n, solution: stepsFromDec(n, b) };
    },
    binHex(r) {
      const n = int(r, 20, 4000), bits = n.toString(2);
      return { kind: 'binHex', label: 'binär → hex', prompt: 'Wandle direkt (ohne Dezimal) ins <b>Hexadezimalsystem</b> um: ' + numStr(bits, 2), answerBase: 16, answer: n, solution: stepsGroup(bits, 4) };
    },
    hexBin(r) {
      const n = int(r, 20, 4000);
      return { kind: 'hexBin', label: 'hex → binär', prompt: 'Wandle direkt ins <b>Binärsystem</b> um: ' + num(n, 16), answerBase: 2, answer: n, solution: stepsUngroup(digits(n, 16), 4) };
    },
    binOct(r) {
      const n = int(r, 10, 1500), bits = n.toString(2);
      return { kind: 'binOct', label: 'binär → oktal', prompt: 'Wandle direkt ins <b>Oktalsystem</b> um: ' + numStr(bits, 2), answerBase: 8, answer: n, solution: stepsGroup(bits, 3) };
    },
    octBin(r) {
      const n = int(r, 10, 1500);
      return { kind: 'octBin', label: 'oktal → binär', prompt: 'Wandle direkt ins <b>Binärsystem</b> um: ' + num(n, 8), answerBase: 2, answer: n, solution: stepsUngroup(digits(n, 8), 3) };
    },
    hexOct(r) {
      const n = int(r, 30, 4000);
      return { kind: 'hexOct', label: 'hex → oktal', prompt: 'Wandle ' + num(n, 16) + ' ins <b>Oktalsystem</b> um. <span class="muted">(Tipp: über binär)</span>', answerBase: 8, answer: n,
        solution: '<p><b>Schritt 1:</b> hex → binär</p>' + stepsUngroup(digits(n, 16), 4) + '<p><b>Schritt 2:</b> binär → oktal (neu bündeln, diesmal 3er)</p>' + stepsGroup(n.toString(2), 3) };
    },
    octHex(r) {
      const n = int(r, 30, 4000);
      return { kind: 'octHex', label: 'oktal → hex', prompt: 'Wandle ' + num(n, 8) + ' ins <b>Hexadezimalsystem</b> um. <span class="muted">(Tipp: über binär)</span>', answerBase: 16, answer: n,
        solution: '<p><b>Schritt 1:</b> oktal → binär</p>' + stepsUngroup(digits(n, 8), 3) + '<p><b>Schritt 2:</b> binär → hex (neu bündeln, diesmal 4er)</p>' + stepsGroup(n.toString(2), 4) };
    },
    add(r, o) {
      const b = baseOf(r, o.base);
      const nd = b === 2 ? int(r, 5, 8) : b > 36 ? 2 : int(r, 3, 4);
      const lo = Math.pow(b, nd - 1), hi = Math.pow(b, nd) - 1;
      const x = int(r, lo, hi), y = int(r, Math.max(1, Math.floor(lo / b)), hi);
      const A = digits(x, b), B = digits(y, b), s = stepsAdd(A, B, b);
      return { kind: 'add', label: 'Addition Basis ' + b, prompt: 'Addiere schriftlich:' + column(A, B, b, '+') + hint(b), answerBase: b, answer: x + y, solution: s.html };
    },
    sub(r, o) {
      const b = baseOf(r, o.base);
      const nd = b === 2 ? int(r, 5, 8) : b > 36 ? 2 : int(r, 3, 4);
      const lo = Math.pow(b, nd - 1), hi = Math.pow(b, nd) - 1;
      let x = int(r, lo, hi), y = int(r, Math.max(1, Math.floor(lo / b)), hi);
      if (y > x) [x, y] = [y, x];
      if (x === y) x = Math.min(hi, x + int(r, 1, b));
      const A = digits(x, b), B = digits(y, b), s = stepsSub(A, B, b);
      return { kind: 'sub', label: 'Subtraktion Basis ' + b, prompt: 'Subtrahiere schriftlich:' + column(A, B, b, '−') + hint(b), answerBase: b, answer: x - y, solution: s.html };
    },
    valid(r) {
      const b = pick(r, [2, 3, 5, 7, 8, 16]);
      const len = int(r, 3, 5);
      const ds = [int(r, 1, b - 1)];
      for (let i = 1; i < len; i++) ds.push(int(r, 0, b - 1));
      const bad = r() < 0.5;
      if (bad) ds[int(r, 0, len - 1)] = int(r, b, Math.min(b + 3, 35));
      const s = ds.map(d => SYM[d]).join('');
      const ok = !bad;
      return { kind: 'valid', label: 'gültige Ziffern', prompt: 'Ist ' + numStr(s, b) + ' eine gültige Zahl im ' + name(b) + '?', choices: ['gültig', 'falsch'], answer: ok ? 'gültig' : 'falsch',
        solution: '<p>Im ' + name(b) + ' gibt es nur die Ziffern <b>0 bis ' + SYM[b - 1] + '</b> (immer eine weniger als die Basis). ' + (ok ? 'Alle Ziffern passen → <b>gültig</b>.' : 'Die Ziffer <b>' + ds.filter(d => d >= b).map(d => SYM[d]).join(', ') + '</b> ist zu groß → <b>falsch</b>.') + '</p>' };
    },
    stellen(r) {
      const v = int(r, 0, 2);
      if (v === 0) {
        const b = pick(r, [2, 3, 5, 8, 16]), n = int(r, 2, b === 2 ? 8 : 3), m = Math.pow(b, n) - 1;
        return { kind: 'stellen', label: 'größte Zahl', prompt: 'Was ist die <b>größte ' + n + '-stellige Zahl</b> im ' + name(b) + '? Gib sie <b>dezimal</b> an.', answerBase: 10, answer: m,
          solution: '<p>Überall die größte Ziffer (' + SYM[b - 1] + '): ' + numStr(SYM[b - 1].repeat(n), b) + '. Das ist genau 1 weniger als ' + numStr('1' + '0'.repeat(n), b) + ' = ' + b + '<sup>' + n + '</sup> = ' + Math.pow(b, n) + '.</p><p class="sum">' + b + '<sup>' + n + '</sup> − 1 = <b>' + m + '</b></p>' };
      }
      if (v === 1) {
        const b = pick(r, [2, 3, 5, 8, 16]), n = int(r, 2, b === 2 ? 10 : 3), c = Math.pow(b, n);
        return { kind: 'stellen', label: 'Anzahl Zahlen', prompt: 'Wie viele <b>verschiedene Zahlen</b> kann man mit ' + n + ' Stellen im ' + name(b) + ' darstellen? <span class="muted">(0 mitgezählt)</span>', answerBase: 10, answer: c,
          solution: '<p>Jede der ' + n + ' Stellen hat ' + b + ' Möglichkeiten → ' + Array(n).fill(b).join(' · ') + ' = ' + b + '<sup>' + n + '</sup>.</p><p class="sum">Antwort: <b>' + c + '</b> (von 0 bis ' + (c - 1) + ')</p>' };
      }
      const N = int(r, 20, 1000);
      let k = 1; while (Math.pow(2, k) <= N) k++;
      return { kind: 'stellen', label: 'Anzahl Bit', prompt: 'Wie viele <b>Bit</b> braucht man mindestens, um die Dezimalzahl ' + num(N, 10) + ' binär darzustellen?', answerBase: 10, answer: k,
        solution: '<p>Mit k Bit schafft man 0 bis 2<sup>k</sup> − 1. Suche die kleinste Zweierpotenz, die <b>größer</b> als ' + N + ' ist: 2<sup>' + (k - 1) + '</sup> = ' + Math.pow(2, k - 1) + ' ist zu wenig, 2<sup>' + k + '</sup> = ' + Math.pow(2, k) + ' reicht.</p><p class="sum">Antwort: <b>' + k + ' Bit</b> (' + num(N, 10) + ' = ' + num(N, 2) + ')</p>' };
    }
  };

  // ---------- Komplement & Ersatzaddition (wie im Unterricht: jede Ziffer z → (b−1)−z, dann +1 zur rechtesten Ziffer) ----------
  function splitDec(s) { const p = String(s).replace('.', ',').split(','); return [p[0], p[1] || '']; }
  function joinDec(ds, decLen) { const s = ds.join(''); return decLen ? s.slice(0, s.length - decLen) + ',' + s.slice(s.length - decLen) : s; }
  /* Ziffernfolge (Array, gleiche Länge) → Komplement in Basis b */
  function complementDigits(ds, b) {
    const inv = ds.map(d => b - 1 - d);
    const out = inv.slice();
    let i = out.length - 1, carry = 1;
    while (i >= 0 && carry) { const s = out[i] + carry; out[i] = s % b; carry = s >= b ? 1 : 0; i--; }
    return { inv, out };
  }
  function digitRow(label, ds, decLen, cls) {
    const cells = ds.map(d => '<td class="' + (cls || '') + '">' + (d === '' ? '' : sym(d, 16)) + '</td>');
    if (decLen) cells.splice(ds.length - decLen, 0, '<td>,</td>');
    return '<tr><th>' + label + '</th>' + cells.join('') + '</tr>';
  }
  function stepsComplement(ds, b, decLen) {
    const { inv, out } = complementDigits(ds, b);
    const folge = ds[ds.length - 1] === 0;
    let h = '<p class="muted">' + (b === 2 ? 'Jede 0 wird 1, jede 1 wird 0' : 'Jede Ziffer z wird durch 9 − z ersetzt') + ', danach <b>+1 zur rechtesten Ziffer</b>' + (folge ? ' (Achtung Folgewirkung: dort entsteht ein Übertrag!)' : '') + '.</p>';
    h += '<div class="scroll"><table class="calc kompl">' + digitRow('Zahl', ds, decLen) + digitRow(b === 2 ? 'getauscht' : '9 − z', inv, decLen) +
      digitRow('+1 rechts', ds.map((_, i) => i === ds.length - 1 ? 1 : ''), decLen) +
      digitRow('Komplement', out, decLen, 'dg') + '</table></div>';
    return { html: h, digits: out };
  }
  /* Ersatzaddition: A − B = A + Komplement(B), erste Stelle streichen */
  function stepsErsatz(Astr, Bstr, b) {
    const [ai, ad] = splitDec(Astr), [bi, bd] = splitDec(Bstr);
    const il = Math.max(ai.length, bi.length), dl = Math.max(ad.length, bd.length);
    const pad = (i, d) => (i.padStart(il, '0') + d.padEnd(dl, '0')).split('').map(c => SYM.indexOf(c.toUpperCase()));
    const A = pad(ai, ad), B = pad(bi, bd);
    const k = stepsComplement(B, b, dl);
    const sum = addCore(A, k.digits, b).res;
    const res = sum.slice(1);
    while (res.length > dl + 1 && res[0] === 0) res.shift();
    let h = '<p><b>Schritt 1:</b> Beide Zahlen auf <b>gleich viele Stellen</b> bringen: ' + joinDec(B.map(d => SYM[d]), dl) + '</p>';
    h += '<p><b>Schritt 2:</b> Komplementärzahl bilden</p>' + k.html;
    h += '<p><b>Schritt 3:</b> Addieren statt subtrahieren</p>';
    const w = sum.length;
    const row = (op, ds, cls) => { const c = ds.map(d => '<td>' + SYM[d] + '</td>'); if (dl) c.splice(ds.length - dl, 0, '<td>,</td>'); while (c.length < w + (dl ? 1 : 0)) c.unshift('<td></td>'); return '<tr class="' + (cls || '') + '"><th>' + op + '</th>' + c.join('') + '</tr>'; };
    h += '<table class="col">' + row('', A) + row('+', k.digits) + row('', sum, 'res').replace('<td>1</td>', '<td><s style="color:var(--bad)">1</s></td>') + '</table>';
    h += '<p><b>Schritt 4:</b> Die <b>erste (höchstwertige) Stelle streichen</b>.</p>';
    h += '<p class="sum">Ergebnis: <b>' + joinDec(res.map(d => SYM[d]), dl) + '</b>' + (b === 2 ? '<sub>2</sub>' : '') + ' <span class="muted">· Probe: normal subtrahieren gibt dasselbe</span></p>';
    return { html: h, result: joinDec(res.map(d => SYM[d]), dl) };
  }

  /* Schriftliche Binär-Multiplikation wie im Heft: für jede Ziffer des 2. Faktors (von links) eine Zeile, jeweils 1 nach rechts versetzt */
  function stepsMul(a, b) {
    const as = a.toString(2), bs = b.toString(2), m = bs.length;
    const prod = a * b, ps = prod.toString(2), w = Math.max(ps.length, as.length + m - 1);
    let h = '<p class="muted">Jede Ziffer des zweiten Faktors einzeln: bei <b>1</b> den ersten Faktor abschreiben, bei <b>0</b> nur Nullen – jede Zeile <b>eine Stelle weiter rechts</b>. Dann alles addieren.</p>';
    h += '<table class="col">';
    const rowAt = (str, endCol, op, cls) => { const c = Array(w).fill(''); for (let i = 0; i < str.length; i++) c[endCol - str.length + 1 + i] = str[i]; return '<tr class="' + (cls || '') + '"><th>' + (op || '') + '</th>' + c.map(x => '<td>' + x + '</td>').join('') + '</tr>'; };
    for (let i = 0; i < m; i++) {
      const end = w - m + i;
      h += rowAt(bs[i] === '1' ? as : '0'.repeat(as.length), end, i ? '+' : '', '');
    }
    h += rowAt(ps, w - 1, '', 'res') + '</table>';
    h += '<p class="hint">Faktoren: ' + numStr(as, 2) + ' · ' + numStr(bs, 2) + '. Zeilen: ' + bs.split('').map(c => c === '1' ? '1 → abschreiben' : '0 → Nullen').join(' · ') + '</p>';
    h += '<p class="sum">Ergebnis: ' + num(prod, 2) + ' <span class="muted">· Probe dezimal: ' + a + ' · ' + b + ' = ' + prod + '</span></p>';
    return h;
  }

  function decStr(r, intLen, decLen) {
    let s = String(int(r, 1, 9));
    for (let i = 1; i < intLen; i++) s += int(r, 0, 9);
    if (decLen) { s += ','; for (let i = 0; i < decLen; i++) s += int(r, 0, 9); }
    return s;
  }
  function toScaled(s, dl) { const [i, d] = splitDec(s); return parseInt(i + d.padEnd(dl, '0'), 10); }

  Object.assign(GEN, {
    komplDez(r) {
      const v = int(r, 0, 2);
      if (v === 0) {
        const n = int(r, 1, 4), B = decStr(r, n, 0), w = n + int(r, 0, 2);
        const ds = B.padStart(w, '0').split('').map(Number), k = stepsComplement(ds, 10, 0);
        return { kind: 'komplDez', label: 'Komplement dezimal', prompt: 'Bilde die <b>Komplementärzahl</b> von <b>' + B + '</b> mit <b>' + w + ' Stellen</b>.', exact: k.digits.join(''), answer: k.digits.join(''), solution: (w > n ? '<p>Erst auf ' + w + ' Stellen auffüllen: ' + ds.join('') + '</p>' : '') + k.html };
      }
      const dl = v === 2 ? 2 : 0;
      const A = decStr(r, 4, dl), B = decStr(r, int(r, 1, 3), dl ? int(r, 1, 2) : 0);
      const [bi, bd] = splitDec(B);
      const ds = (bi.padStart(4, '0') + bd.padEnd(dl, '0')).split('').map(Number), k = stepsComplement(ds, 10, dl);
      const ans = joinDec(k.digits.map(String), dl);
      return { kind: 'komplDez', label: 'Komplement dezimal', prompt: 'Du willst <b>' + A + ' − ' + B + '</b> mit Ersatzaddition rechnen. Wie lautet die <b>Komplementärzahl</b> von ' + B + '?', exact: ans, answer: ans,
        solution: '<p>Erst auf das Format von ' + A + ' bringen: <b>' + joinDec(ds.map(String), dl) + '</b></p>' + k.html };
    },
    ersatzDez(r) {
      const dl = r() < 0.5 ? 2 : 0;
      const A = decStr(r, int(r, 4, 6), dl);
      let B; do { B = decStr(r, int(r, 1, splitDec(A)[0].length - 1), dl ? int(r, 1, 2) : 0); } while (toScaled(B, dl) >= toScaled(A, dl));
      const s = stepsErsatz(A, B, 10);
      return { kind: 'ersatzDez', label: 'Ersatzaddition dezimal', prompt: 'Berechne <b>' + A + ' − ' + B + '</b> mit <b>Ersatzaddition</b> (Komplementärzahl addieren, erste Stelle streichen).', decimal: dl, answer: toScaled(A, dl) - toScaled(B, dl), answerShow: s.result, solution: s.html };
    },
    komplBin(r) {
      const w = pick(r, [4, 5, 6, 7, 8]);
      const val = int(r, 1, Math.pow(2, w) - 1);
      const short = r() < 0.3 && w === 8;
      const ds = val.toString(2).padStart(w, '0').split('').map(Number), k = stepsComplement(ds, 2, 0);
      const shown = short ? val.toString(2) : ds.join('');
      return { kind: 'komplBin', label: 'Komplement binär', prompt: 'Bilde die <b>Komplementärzahl</b> von ' + numStr(shown, 2) + (short ? ' als <b>8-Bit-Zahl</b>' : ' (gleiche Stellenanzahl)') + '.', exact: k.digits.join(''), answer: k.digits.join(''),
        solution: (short ? '<p>Erst auf 8 Bit auffüllen: ' + ds.join('') + '</p>' : '') + k.html };
    },
    ersatzBin(r) {
      const w = int(r, 5, 8), a = int(r, Math.pow(2, w - 1), Math.pow(2, w) - 1), b = int(r, 1, a - 1);
      const s = stepsErsatz(a.toString(2), b.toString(2), 2);
      return { kind: 'ersatzBin', label: 'Ersatzaddition binär', prompt: 'Berechne mit <b>Ersatzaddition</b>: ' + numStr(a.toString(2), 2) + ' − ' + numStr(b.toString(2), 2), answerBase: 2, answer: a - b, solution: s.html };
    },
    mulBin(r) {
      const a = int(r, 5, 63), b = int(r, 3, 15);
      return { kind: 'mulBin', label: 'Multiplikation binär', prompt: 'Multipliziere schriftlich: ' + numStr(a.toString(2), 2) + ' · ' + numStr(b.toString(2), 2), answerBase: 2, answer: a * b, solution: stepsMul(a, b) };
    }
  });

  function make(spec, r) { return GEN[spec.kind](r, spec); }

  /* Antwort prüfen → { ok, msg } */
  function check(task, input) {
    if (task.choices) return { ok: input === task.answer };
    if (task.exact !== undefined) {
      const s = String(input || '').replace(/\s/g, '').replace('.', ',');
      if (!s) return { ok: false, msg: 'Bitte eine Zahl eingeben.', invalid: true };
      if (!/^[01-9]+(,[0-9]+)?$/.test(s)) return { ok: false, msg: 'Nur Ziffern (und evtl. ein Komma) eingeben.', invalid: true };
      if (s.length !== task.exact.length && s.replace(/^0+/, '') === task.exact.replace(/^0+/, '')) return { ok: false, msg: 'Fast! Aber die Komplementärzahl braucht <b>genau gleich viele Stellen</b> – führende Ziffern nicht weglassen.' };
      return { ok: s === task.exact };
    }
    if (task.decimal !== undefined) {
      const s = String(input || '').replace(/\s/g, '').replace('.', ',');
      if (!/^\d+(,\d+)?$/.test(s)) return { ok: false, msg: 'Bitte eine Dezimalzahl eingeben, z. B. 7870,11', invalid: true };
      const [i, d] = splitDec(s);
      if (d.length > task.decimal && /[1-9]/.test(d.slice(task.decimal))) return { ok: false };
      return { ok: parseInt(i + d.slice(0, task.decimal).padEnd(task.decimal, '0'), 10) === task.answer };
    }
    const p = parse(input, task.answerBase);
    if (!p.ok) return { ok: false, msg: p.error, invalid: true };
    return { ok: p.value === task.answer };
  }
  function answerText(task) {
    if (task.exact !== undefined) return '<span class="n">' + task.exact + '</span>';
    if (task.decimal !== undefined) return '<span class="n">' + task.answerShow + '</span>';
    return task.choices ? task.answer : numStr(fmt(task.answer, task.answerBase), task.answerBase); }

  /* Tabelle 0–15 (für Spickzettel & Lektionen) */
  function table16() {
    let h = '<table class="t16"><thead><tr><th>dez</th><th>binär</th><th>okt</th><th>hex</th></tr></thead><tbody>';
    for (let i = 0; i < 16; i++) h += '<tr><td>' + i + '</td><td class="mono">' + i.toString(2).padStart(4, '0') + '</td><td>' + i.toString(8) + '</td><td><b>' + SYM[i] + '</b></td></tr>';
    return h + '</tbody></table>';
  }

  const api = { stepsErsatz, stepsComplement, stepsMul, SYM, digits, sym, fmt, fmtDigits, value, name, parse, num, numStr, stepsToDec, stepsFromDec, stepsGroup, stepsUngroup, stepsAdd, stepsSub, rng, GEN, make, check, answerText, table16 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Zahlen = api;
})(this);
