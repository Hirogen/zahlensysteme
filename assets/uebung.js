/* uebung.js – interaktive Bausteine: Übungsrunde, Testsimulation, Rechenweg-Rechner, Schritt-für-Schritt.
   Braucht zahlen.js. */
(function () {
  'use strict';
  const Z = window.Zahlen;
  const $ = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem('zs:' + k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('zs:' + k, JSON.stringify(v)); } catch (e) { /* egal */ } }
  };
  function shuffle(a, r) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function plan(specs, count, r) {
    const out = [];
    while (out.length < count) out.push(...shuffle(specs, r));
    return out.slice(0, count);
  }

  /* ---------- Übungsrunde mit Sofort-Feedback ---------- */
  function mount(el, opts) {
    const count = opts.count || 10;
    const key = opts.storeKey;
    let r, queue, i, results, retries;

    function start() {
      r = Z.rng(Date.now() ^ (Math.random() * 1e9));
      queue = plan(opts.specs, count, r).map(s => ({ spec: s, task: Z.make(s, r), retry: false }));
      i = 0; results = []; retries = 0;
      render();
    }
    function head() {
      const best = key && store.get(key);
      let dots = '';
      queue.forEach((q, j) => { dots += '<i class="' + (j < results.length ? (results[j] ? 'ok' : 'bad') : j === i ? 'cur' : '') + '" title="' + (q.retry ? 'Wiederholung' : '') + '"></i>'; });
      return '<div class="ueb-head"><span class="ueb-title">' + (opts.title || 'Üben') + '</span><span class="ueb-meta">Aufgabe ' + Math.min(i + 1, queue.length) + ' von ' + queue.length + (best ? ' · Bestwert ' + best.pct + ' %' : '') + '</span></div><div class="dots">' + dots + '</div>';
    }
    function render() {
      if (i >= queue.length) return finish();
      const t = queue[i].task;
      el.className = 'ueb';
      el.innerHTML = head() + (queue[i].retry ? '<p class="hint">↻ Wiederholung: gleiche Art wie vorhin, neue Zahl.</p>' : '') + '<div class="ueb-q">' + t.prompt + '</div>';
      if (t.choices) {
        const c = $('<div class="choices"></div>');
        t.choices.forEach(ch => { const b = $('<button class="ghost" type="button"></button>'); b.textContent = ch; b.onclick = () => answer(ch); c.appendChild(b); });
        el.appendChild(c);
      } else {
        const row = $('<form class="ueb-row" autocomplete="off"><input type="text" aria-label="Deine Antwort" placeholder="' + (t.answerBase ? 'Antwort im ' + Z.name(t.answerBase) : 'Antwort') + '" spellcheck="false" autocapitalize="characters"><button type="submit">Prüfen</button></form>');
        row.onsubmit = (e) => { e.preventDefault(); answer(row.querySelector('input').value); };
        el.appendChild(row);
        row.querySelector('input').focus({ preventScroll: true });
      }
    }
    function answer(input) {
      const t = queue[i].task, res = Z.check(t, input);
      const old = el.querySelector('.fb'); if (old) old.remove();
      if (res.invalid) { el.appendChild($('<div class="fb warn">' + res.msg + '</div>')); return; }
      results.push(res.ok);
      if (!res.ok && retries < 5) { retries++; queue.push({ spec: queue[i].spec, task: Z.make(queue[i].spec, r), retry: true }); }
      el.querySelectorAll('input,.choices button,.ueb-row button').forEach(x => x.disabled = true);
      const fb = $('<div class="fb ' + (res.ok ? 'ok' : 'bad') + '"><div class="verdict">' + (res.ok ? '✓ Richtig!' : '✗ Leider nicht. Richtig wäre: ' + Z.answerText(t)) + '</div>' +
        '<details' + (res.ok ? '' : ' open') + '><summary>Rechenweg</summary><div class="sol">' + t.solution + '</div></details>' +
        '<div class="ueb-row"><button type="button" class="next">' + (i + 1 < queue.length ? 'Nächste Aufgabe →' : 'Auswertung →') + '</button></div></div>');
      el.appendChild(fb);
      const dots = el.querySelector('.dots'); dots.outerHTML = head().match(/<div class="dots">.*<\/div>$/)[0];
      const nb = fb.querySelector('.next'); nb.onclick = () => { i++; render(); }; nb.focus({ preventScroll: true });
      if (!res.ok) fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    function finish() {
      const first = results.slice(0, count), right = first.filter(Boolean).length, pct = Math.round(100 * right / count);
      if (key) { const best = store.get(key); if (!best || pct >= best.pct) store.set(key, { pct, at: Date.now() }); }
      const msg = pct >= 90 ? 'Stark! Das sitzt. Morgen nochmal kurz wiederholen, dann bleibt es.' : pct >= 70 ? 'Gut! Schau dir die roten Rechenwege nochmal an und mach eine zweite Runde.' : 'Noch wackelig – völlig normal. Lies das Beispiel oben nochmal Schritt für Schritt und versuch eine neue Runde.';
      el.innerHTML = head() + '<div class="result-big">' + right + ' / ' + count + '</div><p>' + msg + '</p>' + (retries ? '<p class="muted">Wiederholungen von Fehlern zählen nicht zur Wertung – sie sind zum Festigen da.</p>' : '') + '<div class="ueb-row"><button type="button">Neue Runde</button></div>';
      el.querySelector('button').onclick = start;
    }
    start();
  }

  /* ---------- Testsimulation: alles auf einmal, Bewertung erst am Ende ---------- */
  function test(el, opts) {
    const count = opts.count || 12, minutes = opts.minutes || 30;
    let tasks, t0, timer;
    function start() {
      const r = Z.rng(Date.now() ^ (Math.random() * 1e9));
      tasks = opts.specs.slice(0, count).map(s => Z.make(s, r));
      el.className = 'ueb';
      el.innerHTML = '<div class="ueb-head"><span class="ueb-title">' + (opts.title || 'Testsimulation') + '</span><span class="timer" aria-live="off">' + minutes + ':00</span></div>' +
        '<p class="muted">Wie im echten Test: erst am Ende gibt es Feedback. Rechne auf Papier mit und tippe nur das Ergebnis ein.</p><ol class="testlist"></ol><div class="ueb-row"><button type="button" class="submit">Abgeben</button></div>';
      const ol = el.querySelector('.testlist');
      tasks.forEach((t, j) => {
        const li = $('<li><div class="ueb-q" style="display:inline">' + t.prompt + '</div></li>');
        if (t.choices) {
          const c = $('<div class="choices"></div>');
          t.choices.forEach(ch => { const b = $('<label style="font:1rem var(--sans)"><input type="radio" name="q' + j + '" value="' + ch + '"> ' + ch + '</label>'); c.appendChild(b); });
          li.appendChild(c);
        } else li.appendChild($('<div class="ueb-row"><input type="text" aria-label="Antwort ' + (j + 1) + '" spellcheck="false" placeholder="' + (t.answerBase ? 'Antwort im ' + Z.name(t.answerBase) : 'Antwort') + '"></div>'));
        ol.appendChild(li);
      });
      el.querySelector('.submit').onclick = grade;
      t0 = Date.now();
      clearInterval(timer);
      timer = setInterval(() => {
        const left = minutes * 60 - Math.floor((Date.now() - t0) / 1000), tm = el.querySelector('.timer');
        if (!tm) return clearInterval(timer);
        tm.textContent = left >= 0 ? Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0') : 'Zeit um!';
        if (left < 0) tm.style.color = 'var(--bad)';
      }, 1000);
    }
    function grade() {
      clearInterval(timer);
      const used = Math.round((Date.now() - t0) / 60000);
      let right = 0;
      el.querySelectorAll('.testlist > li').forEach((li, j) => {
        const t = tasks[j];
        const inp = t.choices ? (li.querySelector('input:checked') || {}).value : li.querySelector('input').value;
        const res = inp ? Z.check(t, inp) : { ok: false, msg: 'nicht beantwortet' };
        if (res.ok) right++;
        li.querySelectorAll('input').forEach(x => x.disabled = true);
        li.appendChild($('<div class="fb ' + (res.ok ? 'ok' : 'bad') + '"><span class="verdict">' + (res.ok ? '✓ richtig' : '✗ ' + (res.msg ? res.msg + ' – ' : '') + 'richtig: ' + Z.answerText(t)) + '</span><details' + (res.ok ? '' : ' open') + '><summary>Rechenweg</summary><div class="sol">' + t.solution + '</div></details></div>'));
      });
      const pct = Math.round(100 * right / tasks.length);
      const note = pct >= 88 ? '1 – Sehr gut' : pct >= 75 ? '2 – Gut' : pct >= 63 ? '3 – Befriedigend' : pct >= 50 ? '4 – Genügend' : '5 – Nicht genügend';
      if (opts.storeKey) store.set(opts.storeKey, { pct, at: Date.now() });
      const sum = $('<div class="box"><div class="result-big">' + right + ' / ' + tasks.length + ' <span class="muted" style="font-size:1rem">(' + pct + ' %, ' + used + ' min)</span></div><p>Grobe Notenschätzung: <b>' + note + '</b> <span class="muted">(Schlüssel ist geschätzt, nicht der des Lehrers)</span></p><p>Geh die roten Aufgaben durch: <b>welcher Schritt</b> ging schief? Genau den nochmal in der passenden Lektion üben.</p><button type="button">Neuer Test</button></div>');
      sum.querySelector('button').onclick = () => { start(); el.scrollIntoView({ behavior: 'smooth' }); };
      el.querySelector('.submit').replaceWith(sum);
      sum.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    start();
  }

  /* ---------- Rechenweg-Rechner (zum Selber-Erklären & Kontrollieren) ---------- */
  function playground(el) {
    el.className = 'ueb';
    el.innerHTML = '<div class="ueb-head"><span class="ueb-title">Rechenweg-Rechner</span><span class="ueb-meta">Zum Kontrollieren von Hausübungen</span></div>' +
      '<div class="tabs"><button type="button" data-m="conv" aria-pressed="true">Umwandeln</button><button type="button" data-m="calc" aria-pressed="false">Rechnen + / −</button></div>' +
      '<form class="pg-conv ueb-row" autocomplete="off"><input type="text" name="x" value="2A3" aria-label="Zahl" style="flex:2 1 8rem"> <label>von Basis <input type="number" name="from" value="16" min="2" max="99"></label> <label>nach Basis <input type="number" name="to" value="8" min="2" max="99"></label> <button type="submit">Zeigen</button></form>' +
      '<form class="pg-calc ueb-row" autocomplete="off" hidden><input type="text" name="a" value="3A7" aria-label="Erste Zahl"> <select name="op" aria-label="Rechenart"><option>+</option><option>−</option></select> <input type="text" name="b" value="1C9" aria-label="Zweite Zahl"> <label>Basis <input type="number" name="base" value="16" min="2" max="99"></label> <button type="submit">Zeigen</button></form>' +
      '<div class="out" style="margin-top:1rem"></div>';
    const out = el.querySelector('.out'), fc = el.querySelector('.pg-conv'), fk = el.querySelector('.pg-calc');
    el.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
      el.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-pressed', x === b));
      fc.hidden = b.dataset.m !== 'conv'; fk.hidden = b.dataset.m !== 'calc'; out.innerHTML = '';
    });
    const bad = (m) => { out.innerHTML = '<div class="fb warn">' + m + '</div>'; };
    const okBase = (b) => Number.isInteger(b) && b >= 2 && b <= 99;
    fc.onsubmit = (e) => {
      e.preventDefault();
      const from = +fc.from.value, to = +fc.to.value;
      if (!okBase(from) || !okBase(to)) return bad('Basis muss zwischen 2 und 99 liegen.');
      const p = Z.parse(fc.x.value, from);
      if (!p.ok) return bad(p.error);
      if (p.value > 1e12) return bad('Bitte eine kleinere Zahl.');
      let h = '<p class="sum">' + Z.numStr(Z.fmtDigits(p.digits, from), from) + ' = <b>' + Z.num(p.value, to) + '</b></p>';
      const short = (from === 2 && (to === 16 || to === 8)) ? Z.stepsGroup(Z.fmt(p.value, 2), to === 16 ? 4 : 3)
        : ((from === 16 || from === 8) && to === 2) ? Z.stepsUngroup(p.digits, from === 16 ? 4 : 3) : null;
      if (short) h += '<h3>Abkürzung über Bündel</h3>' + short;
      else {
        if (from !== 10) h += '<h3>' + (to === 10 ? '' : 'Schritt 1: ') + 'Basis ' + from + ' → dezimal (Stellenwert)</h3>' + Z.stepsToDec(p.digits, from);
        if (to !== 10) h += '<h3>' + (from === 10 ? '' : 'Schritt 2: ') + 'dezimal → Basis ' + to + ' (Division mit Rest)</h3>' + Z.stepsFromDec(p.value, to);
        if ((from === 16 && to === 8) || (from === 8 && to === 16)) h += '<p class="hint">Schneller geht hex ↔ oktal über binär (Lektion 3).</p>';
      }
      out.innerHTML = h;
    };
    fk.onsubmit = (e) => {
      e.preventDefault();
      const b = +fk.base.value;
      if (!okBase(b)) return bad('Basis muss zwischen 2 und 99 liegen.');
      const A = Z.parse(fk.a.value, b), B = Z.parse(fk.b.value, b);
      if (!A.ok) return bad('Erste Zahl: ' + A.error);
      if (!B.ok) return bad('Zweite Zahl: ' + B.error);
      if (fk.op.value === '+') out.innerHTML = Z.stepsAdd(A.digits, B.digits, b).html;
      else if (A.value < B.value) bad('Die erste Zahl muss größer sein (sonst wird das Ergebnis negativ).');
      else out.innerHTML = Z.stepsSub(A.digits, B.digits, b).html;
    };
    fc.requestSubmit ? fc.requestSubmit() : fc.onsubmit(new Event('submit'));
  }

  /* ---------- Schritt für Schritt ---------- */
  function steppers() {
    document.querySelectorAll('.stepper').forEach(s => {
      const steps = [...s.querySelectorAll('.step')];
      if (!steps.length) return;
      let k = 0;
      const btn = $('<button type="button" class="ghost no-print" style="margin-top:.8rem"></button>');
      const label = () => { btn.textContent = 'Schritt ' + (k + 1) + ' von ' + steps.length + ' zeigen ▸'; };
      btn.onclick = () => { steps[k].classList.add('shown'); k++; if (k >= steps.length) btn.remove(); else label(); };
      label();
      s.appendChild(btn);
    });
  }
  document.addEventListener('DOMContentLoaded', steppers);

  window.Uebung = { mount, test, playground, store };
})();
