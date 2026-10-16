/* zeiten-uebung.js – Übungsrunde mit Sofort-Feedback und Probetest für die Zeitformen.
   Braucht zeiten.js. Nutzt die Klassen aus assets/style.css (.ueb, .fb, .dots …). */
(function () {
  'use strict';
  const Z = window.Zeiten;
  const $ = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem('zt:' + k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('zt:' + k, JSON.stringify(v)); } catch (e) { /* egal */ } }
  };
  function shuffle(a, r) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function plan(specs, count, r) { const out = []; while (out.length < count) out.push(...shuffle(specs, r)); return out.slice(0, count); }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- Übungsrunde ---------- */
  function mount(el, opts) {
    const count = opts.count || 10, key = opts.storeKey;
    let r, queue, i, results, retries;
    function start() {
      r = Z.rng(Date.now() ^ (Math.random() * 1e9));
      queue = plan(opts.specs, count, r).map(s => ({ spec: s, task: Z.make(s, r), retry: false }));
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
      el.innerHTML = head() + (queue[i].retry ? '<p class="hint">↻ Wiederholung: gleiche Art wie vorhin, neuer Satz.</p>' : '') + '<div class="ueb-q">' + t.prompt + '</div>';
      if (t.choices) {
        const c = $('<div class="choices"></div>');
        t.choices.forEach(ch => { const b = $('<button class="ghost" type="button"></button>'); b.textContent = ch; b.onclick = () => answer(ch); c.appendChild(b); });
        el.appendChild(c);
      } else {
        const row = $('<form class="ueb-row" autocomplete="off"><input type="text" class="txt" aria-label="Deine Antwort" placeholder="' + (t.full ? 'ganzer Satz' : 'Antwort') + '" spellcheck="false" autocapitalize="off"><button type="submit">Prüfen</button></form>');
        row.onsubmit = (e) => { e.preventDefault(); answer(row.querySelector('input').value); };
        el.appendChild(row);
        el.appendChild(umlautBar(row.querySelector('input')));
        row.querySelector('input').focus({ preventScroll: true });
      }
    }
    function answer(input) {
      const t = queue[i].task, res = Z.check(t, input);
      const old = el.querySelector('.fb'); if (old) old.remove();
      if (res.invalid) { el.appendChild($('<div class="fb warn">' + res.msg + '</div>')); return; }
      results.push(res.ok);
      if (!res.ok && retries < 5) { retries++; queue.push({ spec: queue[i].spec, task: Z.make(queue[i].spec, r), retry: true }); }
      el.querySelectorAll('input,.choices button,.ueb-row button,.umlaut button').forEach(x => x.disabled = true);
      const fb = $('<div class="fb ' + (res.ok ? 'ok' : 'bad') + '"><div class="verdict">' + (res.ok ? '✓ Richtig!' : '✗ Leider nicht. Richtig: ' + esc(t.show)) + '</div>' +
        (!res.ok && !t.choices ? '<p class="hint">Deine Antwort: ' + esc(input) + '</p>' : '') +
        '<details' + (res.ok ? '' : ' open') + '><summary>Warum?</summary><div class="sol">' + t.solution + '</div></details>' +
        '<div class="ueb-row"><button type="button" class="next">' + (i + 1 < queue.length ? 'Nächste Aufgabe →' : 'Auswertung →') + '</button></div></div>');
      el.appendChild(fb);
      el.querySelector('.dots').outerHTML = dots();
      const nb = fb.querySelector('.next'); nb.onclick = () => { i++; render(); }; nb.focus({ preventScroll: true });
      if (!res.ok) fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    function finish() {
      const first = results.slice(0, count), right = first.filter(Boolean).length, pct = Math.round(100 * right / count);
      if (key) { const best = store.get(key); if (!best || pct >= best.pct) store.set(key, { pct, at: Date.now() }); }
      const msg = pct >= 90 ? 'Stark! Das sitzt. In ein paar Tagen nochmal eine Runde – dann bleibt es wirklich.' : pct >= 70 ? 'Gut! Lies die roten „Warum?“-Erklärungen nochmal und mach eine zweite Runde.' : 'Noch wackelig – ganz normal. Schau dir die Tabelle oben nochmal an und versuch eine neue Runde.';
      el.innerHTML = head() + '<div class="result-big">' + right + ' / ' + count + '</div><p>' + msg + '</p>' + (retries ? '<p class="muted">Wiederholungen nach Fehlern zählen nicht zur Wertung – sie sind zum Festigen da.</p>' : '') + '<div class="ueb-row"><button type="button">Neue Runde</button></div>';
      el.querySelector('button').onclick = start;
    }
    start();
  }

  // Knöpfe für ä ö ü ß (praktisch am Handy/Tablet ohne deutsche Tastatur)
  function umlautBar(input) {
    const bar = $('<div class="umlaut" aria-label="Sonderzeichen"></div>');
    ['ä', 'ö', 'ü', 'ß'].forEach(c => {
      const b = $('<button type="button" class="ghost"></button>'); b.textContent = c;
      b.onclick = () => { const s = input.selectionStart ?? input.value.length; input.value = input.value.slice(0, s) + c + input.value.slice(input.selectionEnd ?? s); input.focus(); input.setSelectionRange(s + 1, s + 1); };
      bar.appendChild(b);
    });
    return bar;
  }

  /* ---------- Probetest: Feedback erst am Ende ---------- */
  function test(el, opts) {
    const minutes = opts.minutes || 25;
    let tasks, t0, timer;
    function start() {
      const r = Z.rng(Date.now() ^ (Math.random() * 1e9));
      tasks = opts.specs.map(s => Z.make(s, r));
      el.className = 'ueb';
      el.innerHTML = '<div class="ueb-head"><span class="ueb-title">' + (opts.title || 'Probetest') + '</span><span class="timer">' + minutes + ':00</span></div>' +
        '<p class="muted">Wie bei der Schularbeit: Feedback gibt es erst nach dem Abgeben.</p><ol class="testlist"></ol><div class="ueb-row"><button type="button" class="submit">Abgeben</button></div>';
      const ol = el.querySelector('.testlist');
      tasks.forEach((t, j) => {
        const li = $('<li><div class="ueb-q" style="display:inline">' + t.prompt + '</div></li>');
        if (t.choices) {
          const c = $('<div class="choices"></div>');
          t.choices.forEach(ch => c.appendChild($('<label style="font:1rem var(--sans)"><input type="radio" name="q' + j + '" value="' + esc(ch) + '"> ' + esc(ch) + '</label>')));
          li.appendChild(c);
        } else li.appendChild($('<div class="ueb-row"><input type="text" class="txt" aria-label="Antwort ' + (j + 1) + '" spellcheck="false" autocapitalize="off" placeholder="' + (t.full ? 'ganzer Satz' : 'Antwort') + '"></div>'));
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
        const inp = t.choices ? (li.querySelector('input:checked') || {}).value : li.querySelector('input').value;
        const res = inp ? Z.check(t, inp) : { ok: false };
        const ok = !!res.ok; if (ok) right++;
        li.querySelectorAll('input').forEach(x => x.disabled = true);
        li.appendChild($('<div class="fb ' + (ok ? 'ok' : 'bad') + '"><span class="verdict">' + (ok ? '✓ richtig' : '✗ ' + (inp ? '' : 'nicht beantwortet – ') + 'richtig: ' + esc(t.show)) + '</span><details' + (ok ? '' : ' open') + '><summary>Warum?</summary><div class="sol">' + t.solution + '</div></details></div>'));
      });
      const pct = Math.round(100 * right / tasks.length);
      const note = pct >= 90 ? '1 – Sehr gut' : pct >= 80 ? '2 – Gut' : pct >= 65 ? '3 – Befriedigend' : pct >= 50 ? '4 – Genügend' : '5 – Nicht genügend';
      if (opts.storeKey) store.set(opts.storeKey, { pct, at: Date.now() });
      const sum = $('<div class="box"><div class="result-big">' + right + ' / ' + tasks.length + ' <span class="muted" style="font-size:1rem">(' + pct + ' %, ' + used + ' min)</span></div><p>Grobe Notenschätzung: <b>' + note + '</b> <span class="muted">(geschätzter Schlüssel, nicht der eurer Lehrkraft)</span></p><p>Bei jeder roten Aufgabe: <b>Welche Regel</b> hätte geholfen? Genau die in der passenden Lektion nochmal üben.</p><button type="button">Neuer Test</button></div>');
      sum.querySelector('button').onclick = () => { start(); el.scrollIntoView({ behavior: 'smooth' }); };
      el.querySelector('.submit').replaceWith(sum);
      sum.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    start();
  }

  /* ---------- Konjugationstabelle für ein Verb (Nachschlagen) ---------- */
  function tabelle(el, inf, voice) {
    const v = Z.BY[inf]; if (!v) return;
    if (voice === 'passiv') { // Passiv nur 3. Person → Zeitformen als Zeilen (passt auch aufs Handy und auf A4)
      el.innerHTML = '<div class="scroll"><table class="konj"><tr><th></th><th>Einzahl (er/sie/es)</th><th>Mehrzahl (sie)</th></tr>' +
        Z.TENSES.map(t => '<tr><th>' + Z.NAME[t] + '</th><td>' + Z.verbChunk(v, 2, t, 'passiv')[0] + '</td><td>' + Z.verbChunk(v, 5, t, 'passiv')[0] + '</td></tr>').join('') + '</table></div>';
      return;
    }
    const P = Z.PRON;
    let h = '<div class="scroll"><table class="konj"><tr><th></th>' + Z.TENSES.map(t => '<th>' + Z.NAME[t] + '</th>').join('') + '</tr>';
    [0, 1, 2, 3, 4, 5].forEach(p => {
      if (voice === 'passiv' && p !== 2 && p !== 5) return;
      h += '<tr><th>' + P[p] + '</th>' + Z.TENSES.map(t => '<td>' + Z.verbChunk(v, p, t, voice).join('<br><span class="muted">oder </span>') + '</td>').join('') + '</tr>';
    });
    el.innerHTML = h + '</table></div>';
  }

  /* ---------- Schritt für Schritt (wie in den Zahlensystem-Lektionen) ---------- */
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
    document.querySelectorAll('[data-zeitstrahl]').forEach(d => { const v = d.dataset.zeitstrahl; d.innerHTML = Z.zeitstrahl(v ? v.split(',') : null); });
  }
  document.addEventListener('DOMContentLoaded', steppers);

  window.ZeitenUebung = { mount, test, tabelle, store };
})();
