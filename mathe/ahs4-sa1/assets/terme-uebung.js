/* terme-uebung.js – Übungsrunde mit Sofort-Feedback, Probe-Schularbeit und Stepper.
   Braucht terme.js. Nutzt die Klassen aus ../../assets/style.css (.ueb, .fb, .dots …) und terme.css. */
(function () {
  'use strict';
  const M = window.Terme;
  const $ = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem('m4:' + k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('m4:' + k, JSON.stringify(v)); } catch (e) { /* egal */ } }
  };
  function shuffle(a, r) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function plan(specs, count, r) { const out = []; while (out.length < count) out.push(...shuffle(specs, r)); return out.slice(0, count); }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KEYS = {
    num: ['−', '/', ','],
    surd: ['√', '−', '+', '(', ')'],
    poly: ['²', '³', '^', '−', '(', ')', '/'],
    interval: [']', '[', ';', '−', '∞'],
    list: [';', '−', 'keine']
  };

  /* Eingabefeld + Knöpfe für Zeichen, die am Handy schwer zu tippen sind, + Vorschau "Ich lese" */
  function inputRow(t, onSubmit, compact) {
    const wrap = $('<div></div>');
    const row = $('<form class="ueb-row" autocomplete="off"><input type="text" class="txt" inputmode="text" aria-label="Deine Antwort" placeholder="' + esc(t.ph || 'Antwort') + '" spellcheck="false" autocapitalize="off"></form>');
    if (!compact) row.appendChild($('<button type="submit">Prüfen</button>'));
    const inp = row.querySelector('input');
    const bar = $('<div class="mbar no-print" aria-label="Sonderzeichen"></div>');
    (KEYS[t.mode] || []).forEach(k => {
      const btn = $('<button type="button" class="ghost"></button>'); btn.textContent = k;
      btn.onclick = () => {
        const ins = k === '−' ? '-' : k;
        if (k === 'keine') inp.value = 'keine';
        else { const s = inp.selectionStart ?? inp.value.length; inp.value = inp.value.slice(0, s) + ins + inp.value.slice(inp.selectionEnd ?? s); inp.setSelectionRange(s + ins.length, s + ins.length); }
        inp.focus(); inp.dispatchEvent(new Event('input'));
      };
      bar.appendChild(btn);
    });
    const pv = $('<div class="preview" aria-live="polite"></div>');
    inp.addEventListener('input', () => {
      const v = inp.value.trim();
      if (!v) { pv.innerHTML = ''; return; }
      try { pv.innerHTML = 'Ich lese: <span class="pvx">' + M.preview(t, v) + '</span>'; } catch (e) { pv.innerHTML = '<span class="muted">…</span>'; }
    });
    if (onSubmit) row.onsubmit = (e) => { e.preventDefault(); onSubmit(inp.value); };
    wrap.appendChild(row); wrap.appendChild(bar); wrap.appendChild(pv);
    wrap.input = inp;
    return wrap;
  }
  // Ankreuzen (mehrere richtig)
  function multiRow(t, name, onSubmit) {
    const w = $('<div><div class="choices multi"></div></div>');
    const box = w.firstChild;
    t.choices.forEach((ch, k) => box.appendChild($('<label class="check"><input type="checkbox" name="' + name + '" value="' + k + '"> <span>' + ch + '</span></label>')));
    if (onSubmit) { const b = $('<div class="ueb-row"><button type="button">Prüfen</button></div>'); b.firstChild.onclick = () => onSubmit(w.value()); w.appendChild(b); }
    w.value = () => [...w.querySelectorAll('input:checked')].map(x => Number(x.value));
    return w;
  }

  /* ---------- Übungsrunde ---------- */
  function mount(el, opts) {
    const count = opts.count || 10, key = opts.storeKey;
    let r, queue, i, results, retries;
    function start() {
      r = M.rng(Date.now() ^ (Math.random() * 1e9));
      queue = plan(opts.specs, count, r).map(s => ({ spec: s, task: M.make(s, r), retry: false }));
      i = 0; results = []; retries = 0; render();
    }
    function dots() {
      return '<div class="dots">' + queue.map((q, j) => '<i class="' + (j < results.length ? (results[j] ? 'ok' : 'bad') : j === i ? 'cur' : '') + '"></i>').join('') + '</div>';
    }
    function head() {
      const best = key && store.get(key);
      return '<div class="ueb-head"><span class="ueb-title">' + (opts.title || 'Üben') + '</span><span class="ueb-meta">Aufgabe ' + Math.min(i + 1, queue.length) + ' von ' + queue.length + (best ? ' · Bestwert ' + best.pct + ' %' : '') + '</span></div>' + dots();
    }
    function render() {
      if (i >= queue.length) return finish();
      const t = queue[i].task;
      el.className = 'ueb';
      el.innerHTML = head() + (queue[i].retry ? '<p class="hint">↻ Wiederholung: gleiche Art wie vorhin, neue Zahlen.</p>' : '') + '<div class="ueb-q">' + t.prompt + '</div>';
      if (t.mode === 'choice') {
        const c = $('<div class="choices"></div>');
        t.choices.forEach((ch, j) => { const bt = $('<button class="ghost" type="button"></button>'); bt.innerHTML = ch; bt.onclick = () => answer(j, ch); c.appendChild(bt); });
        el.appendChild(c);
      } else if (t.mode === 'multi') {
        el.appendChild(multiRow(t, 'm' + i, v => answer(v, v.map(k => t.choices[k]).join(', ') || 'nichts angekreuzt')));
      } else {
        const w = inputRow(t, v => answer(v, v));
        el.appendChild(w);
        w.input.focus({ preventScroll: true });
      }
    }
    function answer(input, shown) {
      const t = queue[i].task, res = M.check(t, input);
      const old = el.querySelector('.fb'); if (old) old.remove();
      if (res.invalid) { el.appendChild($('<div class="fb warn">' + res.msg + '</div>')); return; }
      results.push(res.ok);
      if (!res.ok && retries < 5) { retries++; queue.push({ spec: queue[i].spec, task: M.make(queue[i].spec, r), retry: true }); }
      el.querySelectorAll('input,.choices button,.ueb-row button,.mbar button').forEach(x => { x.disabled = true; });
      const fb = $('<div class="fb ' + (res.ok ? 'ok' : 'bad') + '"><div class="verdict">' + (res.ok ? '✓ Richtig!' : '✗ Leider nicht. Richtig: ' + t.show) + '</div>' +
        (!res.ok && t.mode !== 'choice' ? '<p class="hint">Deine Antwort: ' + (t.mode === 'multi' ? shown : esc(shown)) + '</p>' : '') +
        '<details' + (res.ok ? '' : ' open') + '><summary>Rechenweg</summary><div class="sol">' + t.solution + '</div></details>' +
        '<div class="ueb-row"><button type="button" class="next">' + (i + 1 < queue.length ? 'Nächste Aufgabe →' : 'Auswertung →') + '</button></div></div>');
      el.appendChild(fb);
      el.querySelector('.dots').outerHTML = dots();
      const nb = fb.querySelector('.next'); nb.onclick = () => { i++; render(); }; nb.focus({ preventScroll: true });
      if (!res.ok) fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    function finish() {
      const first = results.slice(0, count), right = first.filter(Boolean).length, pct = Math.round(100 * right / count);
      if (key) { const best = store.get(key); if (!best || pct >= best.pct) store.set(key, { pct, at: Date.now() }); }
      const msg = pct >= 90 ? 'Stark! Das sitzt. Morgen nochmal eine kurze Runde – dann bleibt es wirklich.' : pct >= 70 ? 'Gut! Schau dir die roten Rechenwege nochmal an und mach eine zweite Runde.' : 'Noch wackelig – ganz normal. Lies den Kasten oben nochmal und versuch eine neue Runde.';
      el.innerHTML = head() + '<div class="result-big">' + right + ' / ' + count + '</div><p>' + msg + '</p>' + (retries ? '<p class="muted">Wiederholungen nach Fehlern zählen nicht zur Wertung – sie sind zum Festigen da.</p>' : '') + '<div class="ueb-row"><button type="button">Neue Runde</button></div>';
      el.querySelector('button').onclick = start;
    }
    start();
  }

  /* ---------- Probe-Schularbeit: Feedback erst am Ende ---------- */
  function test(el, opts) {
    const minutes = opts.minutes || 50;
    let tasks, t0, timer, widgets;
    function start() {
      const r = M.rng(Date.now() ^ (Math.random() * 1e9));
      tasks = opts.specs.map(s => M.make(s, r)); widgets = [];
      el.className = 'ueb';
      el.innerHTML = '<div class="ueb-head"><span class="ueb-title">' + (opts.title || 'Probe-Schularbeit') + '</span><span class="timer">' + minutes + ':00</span></div>' +
        '<p class="muted">Wie bei der Schularbeit: erst auf Papier rechnen, dann das Ergebnis eintippen. Feedback gibt es erst nach dem Abgeben.</p><ol class="testlist"></ol><div class="ueb-row"><button type="button" class="submit">Abgeben</button></div>';
      const ol = el.querySelector('.testlist');
      tasks.forEach((t, j) => {
        const li = $('<li><div class="ueb-q" style="display:inline">' + t.prompt + '</div></li>');
        let w = null;
        if (t.mode === 'choice') {
          const c = $('<div class="choices"></div>');
          t.choices.forEach((ch, k) => c.appendChild($('<label class="radio"><input type="radio" name="q' + j + '" value="' + k + '"> ' + ch + '</label>')));
          li.appendChild(c);
        } else if (t.mode === 'multi') { w = multiRow(t, 'q' + j); li.appendChild(w); }
        else li.appendChild(inputRow(t, null, true));
        widgets.push(w);
        ol.appendChild(li);
      });
      el.querySelector('.submit').onclick = grade;
      t0 = Date.now(); clearInterval(timer);
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
        let inp;
        if (t.mode === 'choice') inp = (li.querySelector('input:checked') || {}).value;
        else if (t.mode === 'multi') inp = widgets[j].value();
        else inp = li.querySelector('input[type=text]').value;
        const empty = inp === undefined || inp === '' || (Array.isArray(inp) && !inp.length && !t.correct.length && false);
        const res = !empty ? M.check(t, inp) : { ok: false };
        const ok = !!res.ok; if (ok) right++;
        li.querySelectorAll('input,button').forEach(x => { x.disabled = true; });
        const why = res.invalid ? ' <span class="hint">(' + res.msg.replace(/<[^>]+>/g, '') + ')</span>' : '';
        li.appendChild($('<div class="fb ' + (ok ? 'ok' : 'bad') + '"><span class="verdict">' + (ok ? '✓ richtig' : '✗ ' + (empty ? 'nicht beantwortet – ' : '') + 'richtig: ' + t.show) + '</span>' + why + '<details' + (ok ? '' : ' open') + '><summary>Rechenweg</summary><div class="sol">' + t.solution + '</div></details></div>'));
      });
      const pct = Math.round(100 * right / tasks.length);
      const note = pct >= 89 ? '1 – Sehr gut' : pct >= 76 ? '2 – Gut' : pct >= 63 ? '3 – Befriedigend' : pct >= 50 ? '4 – Genügend' : '5 – Nicht genügend';
      if (opts.storeKey) store.set(opts.storeKey, { pct, at: Date.now() });
      const sum = $('<div class="box"><div class="result-big">' + right + ' / ' + tasks.length + ' <span class="muted" style="font-size:1rem">(' + pct + ' %, ' + used + ' min)</span></div><p>Grobe Notenschätzung: <b>' + note + '</b> <span class="muted">(geschätzter Schlüssel, nicht der deiner Lehrkraft)</span></p><p>Bei jeder roten Aufgabe: <b>Welche Regel</b> hätte geholfen? Genau die in der passenden Lektion nochmal üben.</p><button type="button">Neue Probe-Schularbeit</button></div>');
      sum.querySelector('button').onclick = () => { start(); el.scrollIntoView({ behavior: 'smooth' }); };
      el.querySelector('.submit').replaceWith(sum);
      sum.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    start();
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
      label(); s.appendChild(btn);
    });
  }
  /* Zahlenstrahlen aus data-Attributen: <div data-zs='{"from":-3,"to":6,"iv":"]1;4]"}'></div> */
  function strahlen() {
    document.querySelectorAll('[data-zs]').forEach(d => {
      const o = JSON.parse(d.getAttribute('data-zs'));
      if (o.iv) o.iv = M.parseInterval(o.iv);
      d.innerHTML = M.zahlenstrahl(o);
    });
  }
  document.addEventListener('DOMContentLoaded', () => { steppers(); strahlen(); });

  window.TermeUebung = { mount, test, store };
})();
