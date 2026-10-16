/* zeiten.js – Konjugations-Engine + Aufgaben-Generatoren für die sechs Zeitformen (Aktiv & Passiv).
   Läuft im Browser (window.Zeiten) und in Node (module.exports) – so ist sie testbar. */
(function (root) {
  'use strict';

  const TENSES = ['praesens', 'praeteritum', 'perfekt', 'plusquamperfekt', 'futur1', 'futur2'];
  const NAME = { praesens: 'Präsens', praeteritum: 'Präteritum', perfekt: 'Perfekt', plusquamperfekt: 'Plusquamperfekt', futur1: 'Futur I', futur2: 'Futur II' };
  const PRON = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie'];
  const AUX = {
    haben: { praesens: ['habe', 'hast', 'hat', 'haben', 'habt', 'haben'], praeteritum: ['hatte', 'hattest', 'hatte', 'hatten', 'hattet', 'hatten'] },
    sein: { praesens: ['bin', 'bist', 'ist', 'sind', 'seid', 'sind'], praeteritum: ['war', 'warst', 'war', 'waren', 'wart', 'waren'] },
    werden: { praesens: ['werde', 'wirst', 'wird', 'werden', 'werdet', 'werden'], praeteritum: ['wurde', 'wurdest', 'wurde', 'wurden', 'wurdet', 'wurden'] }
  };

  /* ---------- Verben ----------
     V(Infinitiv, Präteritum-Stamm (er-Form), Partizip II, Hilfsverb, Ergänzung, Extras)
     Hilfsverb: 'h' = haben · 's' = sein · 'sh' = in Österreich sein, haben auch richtig
     Extras: du = Präsens-Stamm mit Vokalwechsel für du/er · sep = trennbare Vorsilbe
             pres/prt = komplette Formen (ich, du, er, wir, ihr, sie) · art = 'schwach'|'stark'|'gemischt'
             tr = Passiv-fähig: [Einzahl-Subjekt, Mehrzahl-Subjekt] */
  const VERBS = [];
  function V(inf, prt, p2, aux, mid, x) { VERBS.push(Object.assign({ inf, prt3: prt, p2, aux, mid }, x || {})); }
  // schwach
  V('machen', 'machte', 'gemacht', 'h', 'die Hausübung', { art: 'schwach', tr: ['Die Hausübung', 'Die Aufgaben'] });
  V('spielen', 'spielte', 'gespielt', 'h', 'Fußball', { art: 'schwach' });
  V('lernen', 'lernte', 'gelernt', 'h', 'Vokabeln', { art: 'schwach' });
  V('kaufen', 'kaufte', 'gekauft', 'h', 'ein Eis', { art: 'schwach', tr: ['Das Brot', 'Die Äpfel'] });
  V('fragen', 'fragte', 'gefragt', 'h', 'den Lehrer', { art: 'schwach' });
  V('arbeiten', 'arbeitete', 'gearbeitet', 'h', 'im Garten', { art: 'schwach' });
  V('warten', 'wartete', 'gewartet', 'h', 'auf den Bus', { art: 'schwach' });
  V('kochen', 'kochte', 'gekocht', 'h', 'Spaghetti', { art: 'schwach', tr: ['Die Suppe', 'Die Nudeln'] });
  V('putzen', 'putzte', 'geputzt', 'h', 'das Fenster', { art: 'schwach', tr: ['Das Zimmer', 'Die Fenster'] });
  V('hören', 'hörte', 'gehört', 'h', 'Musik', { art: 'schwach' });
  V('erzählen', 'erzählte', 'erzählt', 'h', 'eine Geschichte', { art: 'schwach', tr: ['Die Geschichte', 'Die Märchen'] });
  V('besuchen', 'besuchte', 'besucht', 'h', 'das Museum', { art: 'schwach', tr: ['Das Museum', 'Die Großeltern'] });
  V('reparieren', 'reparierte', 'repariert', 'h', 'das Fahrrad', { art: 'schwach', tr: ['Das Fahrrad', 'Die Fahrräder'] });
  V('korrigieren', 'korrigierte', 'korrigiert', 'h', 'die Schularbeit', { art: 'schwach', tr: ['Die Schularbeit', 'Die Hefte'] });
  V('bauen', 'baute', 'gebaut', 'h', 'ein Baumhaus', { art: 'schwach', tr: ['Das Haus', 'Die Brücken'] });
  V('loben', 'lobte', 'gelobt', 'h', 'den Hund', { art: 'schwach', tr: ['Die Schülerin', 'Die Kinder'] });
  V('reisen', 'reiste', 'gereist', 's', 'nach Italien', { art: 'schwach' });
  V('einkaufen', 'kaufte', 'eingekauft', 'h', 'im Supermarkt', { art: 'schwach', sep: 'ein' });
  // stark
  V('gehen', 'ging', 'gegangen', 's', 'nach Hause', { art: 'stark' });
  V('kommen', 'kam', 'gekommen', 's', 'zu spät', { art: 'stark' });
  V('fahren', 'fuhr', 'gefahren', 's', 'nach Graz', { art: 'stark', du: 'fähr' });
  V('laufen', 'lief', 'gelaufen', 's', 'um den See', { art: 'stark', du: 'läuf' });
  V('schreiben', 'schrieb', 'geschrieben', 'h', 'einen Brief', { art: 'stark', tr: ['Der Brief', 'Die Briefe'] });
  V('lesen', 'las', 'gelesen', 'h', 'ein Buch', { art: 'stark', du: 'lies', tr: ['Das Buch', 'Die Bücher'] });
  V('essen', 'aß', 'gegessen', 'h', 'eine Semmel', { art: 'stark', du: 'iss', tr: ['Die Semmel', 'Die Kekse'] });
  V('trinken', 'trank', 'getrunken', 'h', 'einen Kakao', { art: 'stark', tr: ['Der Saft', 'Die Getränke'] });
  V('finden', 'fand', 'gefunden', 'h', 'den Schlüssel', { art: 'stark', tr: ['Der Schlüssel', 'Die Handys'] });
  V('sehen', 'sah', 'gesehen', 'h', 'einen Film', { art: 'stark', du: 'sieh' });
  V('sprechen', 'sprach', 'gesprochen', 'h', 'mit der Lehrerin', { art: 'stark', du: 'sprich' });
  V('helfen', 'half', 'geholfen', 'h', 'der Nachbarin', { art: 'stark', du: 'hilf' });
  V('nehmen', 'nahm', 'genommen', 'h', 'den Bus', { art: 'stark', pres: ['nehme', 'nimmst', 'nimmt', 'nehmen', 'nehmt', 'nehmen'] });
  V('schwimmen', 'schwamm', 'geschwommen', 'sh', 'im See', { art: 'stark' });
  V('springen', 'sprang', 'gesprungen', 's', 'ins Wasser', { art: 'stark' });
  V('fliegen', 'flog', 'geflogen', 's', 'nach London', { art: 'stark' });
  V('bleiben', 'blieb', 'geblieben', 's', 'zu Hause', { art: 'stark' });
  V('schlafen', 'schlief', 'geschlafen', 'h', 'sehr lange', { art: 'stark', du: 'schläf' });
  V('sitzen', 'saß', 'gesessen', 'sh', 'in der ersten Reihe', { art: 'stark' });
  V('stehen', 'stand', 'gestanden', 'sh', 'an der Haltestelle', { art: 'stark' });
  V('liegen', 'lag', 'gelegen', 'sh', 'in der Sonne', { art: 'stark' });
  V('werfen', 'warf', 'geworfen', 'h', 'den Ball', { art: 'stark', du: 'wirf', tr: ['Der Ball', 'Die Bälle'] });
  V('vergessen', 'vergaß', 'vergessen', 'h', 'den Turnsack', { art: 'stark', du: 'vergiss', tr: ['Der Turnsack', 'Die Hausübungen'] });
  V('waschen', 'wusch', 'gewaschen', 'h', 'das Auto', { art: 'stark', du: 'wäsch', tr: ['Das Auto', 'Die Teller'] });
  V('fangen', 'fing', 'gefangen', 'h', 'den Ball', { art: 'stark', du: 'fäng', tr: ['Der Dieb', 'Die Fische'] });
  V('tragen', 'trug', 'getragen', 'h', 'die Schultasche', { art: 'stark', du: 'träg' });
  V('backen', 'backte', 'gebacken', 'h', 'einen Kuchen', { art: 'gemischt', tr: ['Der Kuchen', 'Die Kekse'] });
  V('aufstehen', 'stand', 'aufgestanden', 's', 'um sieben Uhr', { art: 'stark', sep: 'auf' });
  V('anrufen', 'rief', 'angerufen', 'h', 'den Trainer', { art: 'stark', sep: 'an' });
  V('abfahren', 'fuhr', 'abgefahren', 's', 'um acht Uhr', { art: 'stark', sep: 'ab', du: 'fähr' });
  // gemischt (Vokalwechsel UND -te)
  V('bringen', 'brachte', 'gebracht', 'h', 'den Kuchen', { art: 'gemischt' });
  V('denken', 'dachte', 'gedacht', 'h', 'an die Ferien', { art: 'gemischt' });
  V('rennen', 'rannte', 'gerannt', 's', 'zum Bus', { art: 'gemischt' });
  V('wissen', 'wusste', 'gewusst', 'h', 'die Antwort', { art: 'gemischt', pres: ['weiß', 'weißt', 'weiß', 'wissen', 'wisst', 'wissen'] });
  const BY = {}; VERBS.forEach(v => { BY[v.inf] = v; });

  const SUBJ = [['ich'], ['du'], ['Lena', 'Jonas', 'Oma', 'mein Bruder', 'unsere Lehrerin'], ['wir'], ['ihr'], ['die Kinder', 'meine Eltern', 'Lena und Jonas']];

  /* ---------- Konjugation ---------- */
  const base = v => v.sep ? v.inf.slice(v.sep.length) : v.inf;
  const stemOf = inf => inf.replace(/e?n$/, '');
  const sibilant = s => /(s|ß|z|x)$/.test(s);
  const dental = s => /(t|d)$/.test(s);

  function presentForms(v) {
    if (v.pres) return v.pres.slice();
    const st = stemOf(base(v)), ch = v.du || st;
    const e = dental(st) ? 'e' : '';
    return [st + 'e', ch + (sibilant(ch) ? 't' : (v.du ? '' : e) + 'st'), ch + (v.du ? '' : e) + 't', base(v), st + e + 't', base(v)];
  }
  // Liefert Listen von Varianten pro Person (erste = Hauptform).
  function pastForms(v) {
    if (v.prt) return v.prt.map(f => [f]);
    const s = v.prt3;
    if (/te$/.test(s)) return [[s], [s + 'st'], [s], [s + 'n'], [s + 't'], [s + 'n']];
    if (sibilant(s)) return [[s], [s + 'est', s + 't'], [s], [s + 'en'], [s + 't'], [s + 'en']];
    if (dental(s)) return [[s], [s + 'est', s + 'st'], [s], [s + 'en'], [s + 'et'], [s + 'en']];
    return [[s], [s + 'st'], [s], [s + 'en'], [s + 't'], [s + 'en']];
  }
  const auxList = v => v.aux === 'h' ? ['haben'] : v.aux === 's' ? ['sein'] : ['sein', 'haben'];

  /* Verbteile für eine Zeitform: Array von Varianten { fin, rest:[...], sep } */
  function parts(v, p, tense, voice) {
    const out = [];
    if (voice === 'passiv') {
      const W = AUX.werden, S = AUX.sein;
      const m = {
        praesens: [W.praesens[p], [v.p2]], praeteritum: [W.praeteritum[p], [v.p2]],
        perfekt: [S.praesens[p], [v.p2, 'worden']], plusquamperfekt: [S.praeteritum[p], [v.p2, 'worden']],
        futur1: [W.praesens[p], [v.p2, 'werden']], futur2: [W.praesens[p], [v.p2, 'worden', 'sein']]
      }[tense];
      return [{ fin: m[0], rest: m[1], sep: '' }];
    }
    const sep = v.sep || '';
    if (tense === 'praesens') out.push({ fin: presentForms(v)[p], rest: [], sep });
    else if (tense === 'praeteritum') pastForms(v)[p].forEach(f => out.push({ fin: f, rest: [], sep }));
    else if (tense === 'futur1') out.push({ fin: AUX.werden.praesens[p], rest: [v.inf], sep: '' });
    else auxList(v).forEach(a => {
      if (tense === 'perfekt') out.push({ fin: AUX[a].praesens[p], rest: [v.p2], sep: '', aux: a });
      if (tense === 'plusquamperfekt') out.push({ fin: AUX[a].praeteritum[p], rest: [v.p2], sep: '', aux: a });
      if (tense === 'futur2') out.push({ fin: AUX.werden.praesens[p], rest: [v.p2, a], sep: '', aux: a });
    });
    return out;
  }

  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  /* Satz bauen. order: 'V2' Hauptsatz · 'V1' Verb zuerst (nach Nebensatz) · 'VL' Nebensatz (Verb am Ende) */
  function clause(subj, pt, mid, order) {
    const w = [];
    const rest = pt.rest.join(' ');
    if (order === 'VL') w.push(subj, mid, rest, (pt.sep || '') + pt.fin);
    else if (order === 'V1') w.push(pt.fin, subj, mid, pt.sep, rest);
    else w.push(subj, pt.fin, mid, pt.sep, rest);
    return w.filter(Boolean).join(' ');
  }
  function sentences(v, p, subj, tense, voice, mid) {
    const m = mid === undefined ? (voice === 'passiv' ? '' : v.mid) : mid;
    return parts(v, p, tense, voice).map(pt => cap(clause(subj, pt, m, 'V2')) + '.');
  }
  // nur die Verbteile, z. B. "ist gebacken worden" / "bin … gegangen"
  function verbChunk(v, p, tense, voice) {
    return parts(v, p, tense, voice).map(pt => [pt.fin].concat(pt.rest).join(' ') + (pt.sep ? ' … ' + pt.sep : ''));
  }

  /* ---------- Zufall ---------- */
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const pick = (a, r) => a[Math.floor(r() * a.length)];

  /* ---------- Erklärtexte ---------- */
  const FORMEL = {
    praesens: 'Präsens = Verbstamm + Endung',
    praeteritum: 'Präteritum = 2. Stammform (schwach: Stamm + <b>-te</b>, stark: neuer Vokal)',
    perfekt: 'Perfekt = <b>haben/sein</b> im Präsens + Partizip II',
    plusquamperfekt: 'Plusquamperfekt = <b>hatte/war</b> (Präteritum) + Partizip II',
    futur1: 'Futur I = <b>werden</b> im Präsens + Infinitiv',
    futur2: 'Futur II = <b>werden</b> + Partizip II + <b>haben/sein</b>'
  };
  const FORMEL_P = {
    praesens: 'Passiv Präsens = <b>werden</b> (Präsens) + Partizip II',
    praeteritum: 'Passiv Präteritum = <b>wurde</b> + Partizip II',
    perfekt: 'Passiv Perfekt = <b>ist/sind</b> + Partizip II + <b>worden</b>',
    plusquamperfekt: 'Passiv Plusquamperfekt = <b>war/waren</b> + Partizip II + <b>worden</b>',
    futur1: 'Passiv Futur I = <b>werden</b> + Partizip II + <b>werden</b>',
    futur2: 'Passiv Futur II = <b>werden</b> + Partizip II + <b>worden sein</b>'
  };
  function auxNote(v) {
    if (v.aux === 'sh') return '„' + v.inf + '“: in Österreich mit <b>sein</b> (in Deutschland meist haben) – beides wird als richtig gezählt.';
    if (v.aux === 's') return '„' + v.inf + '“ bildet das Perfekt mit <b>sein</b> (Ortswechsel oder Zustandsänderung).';
    return '„' + v.inf + '“ bildet das Perfekt mit <b>haben</b>.';
  }
  function stammformen(v) {
    const a = auxList(v)[0] === 'sein' ? 'ist' : 'hat';
    return v.inf + ' – ' + pastForms(v)[2][0] + (v.sep ? ' ' + v.sep : '') + ' – ' + a + ' ' + v.p2;
  }

  /* ---------- Aufgaben ----------
     Jede Aufgabe: { prompt, choices?, answers:[akzeptiert], show (richtige Antwort), solution } */
  const pickVerb = (r, f) => pick(VERBS.filter(f || (() => true)), r);
  function person(r) { const p = Math.floor(r() * 6); return { p, subj: pick(SUBJ[p], r) }; }
  const listTenses = s => s.tenses || TENSES;
  const em = s => '<i>' + s + '</i>';

  const GEN = {
    // Zeitform eines Aktivsatzes erkennen
    erkennen(r, s) {
      const v = pickVerb(r), { p, subj } = person(r), t = pick(listTenses(s), r);
      const sent = pick(sentences(v, p, subj, t, 'aktiv'), r);
      return {
        prompt: 'Welche Zeitform?<br>' + em(sent), choices: TENSES.map(x => NAME[x]), answers: [NAME[t]], show: NAME[t],
        solution: '<p>Verbteile: <b>' + verbChunk(v, p, t)[0] + '</b>. ' + FORMEL[t] + '.</p>'
      };
    },
    // Satz in eine andere Zeitform setzen
    bilden(r, s) {
      const v = pickVerb(r, s.filter), { p, subj } = person(r);
      const to = pick(s.to || TENSES, r), from = s.from || pick(TENSES.filter(x => x !== to), r);
      const ans = sentences(v, p, subj, to, 'aktiv');
      return {
        prompt: 'Setze ins <b>' + NAME[to] + '</b>:<br>' + em(sentences(v, p, subj, from, 'aktiv')[0]), answers: ans, show: ans[0], full: true,
        solution: '<p>' + FORMEL[to] + '.</p>' + (['perfekt', 'plusquamperfekt', 'futur2'].includes(to) ? '<p>' + auxNote(v) + '</p>' : '') +
          (ans.length > 1 ? '<p class="hint">Auch richtig: ' + ans.slice(1).join(' · ') + '</p>' : '') +
          '<p class="hint">Stammformen: ' + stammformen(v) + '</p>'
      };
    },
    // eine Präteritumform (oder Präsensform) eintippen
    form(r, s) {
      const v = pickVerb(r, s.filter), { p, subj } = person(r), t = s.tense || 'praeteritum';
      const ps = parts(v, p, t, 'aktiv'), mid = v.mid;
      const gap = cap([subj, '<span class="gap">_____</span> (' + v.inf + ')', mid, ps[0].sep].filter(Boolean).join(' ')) + '.';
      const answers = ps.map(x => x.fin);
      return {
        prompt: 'Ergänze im <b>' + NAME[t] + '</b>:<br>' + em(gap), answers, show: answers[0],
        solution: '<p>' + sentences(v, p, subj, t, 'aktiv')[0] + '</p><p class="hint">' + (v.art ? cap(v.art) + 'es Verb · ' : '') + 'Stammformen: ' + stammformen(v) + '</p>'
      };
    },
    // Partizip II + Hilfsverb ("ist gegangen") für er/sie/es
    perfektForm(r, s) {
      const v = pickVerb(r, s.filter), t = 'perfekt';
      const answers = verbChunk(v, 2, t);
      return {
        prompt: 'Perfekt, er-Form: <b>er ___ (' + v.inf + ')</b><br><span class="hint">Hilfsverb + Partizip II eintippen, z. B. „hat gemacht“</span>', answers, show: answers.join(' / '),
        solution: '<p>' + auxNote(v) + '</p><p class="hint">Stammformen: ' + stammformen(v) + '</p>'
      };
    },
    // haben oder sein?
    hilfsverb(r, s) {
      const v = pickVerb(r, x => x.aux !== 'sh' && !x.sep), { p, subj } = person(r);
      const t = pick(s.tenses || ['perfekt', 'plusquamperfekt'], r);
      const pt = parts(v, p, t, 'aktiv')[0];
      const tt = t === 'perfekt' ? 'praesens' : 'praeteritum';
      const choices = [AUX.haben[tt][p], AUX.sein[tt][p]];
      const sent = cap(clause(subj, { fin: '<span class="gap">_____</span>', rest: pt.rest, sep: '' }, v.mid, 'V2')) + '.';
      return {
        prompt: NAME[t] + ': Welches Hilfsverb?<br>' + em(sent), choices, answers: [pt.fin], show: pt.fin,
        solution: '<p>' + auxNote(v) + '</p><p>' + sentences(v, p, subj, t, 'aktiv')[0] + '</p>'
      };
    },
    // Vorzeitigkeit mit "nachdem"
    nachdem(r, s) {
      const T = pick(NACHDEM, r), va = BY[T.a[0]], vb = BY[T.b[0]];
      const main = pick(s.mains || ['praeteritum', 'praeteritum', 'praesens', 'futur1'], r);
      const need = main === 'praeteritum' ? 'plusquamperfekt' : 'perfekt';
      const nb = cap('nachdem ' + clause(T.s, parts(va, T.p, need, 'aktiv')[0], T.a[1], 'VL'));
      const hs = clause(T.pr, parts(vb, T.p, main, 'aktiv')[0], T.b[1], 'V1');
      const gapNb = cap('nachdem ' + [T.s, T.a[1], '<span class="gap">_____</span> (' + va.inf + ')'].join(' '));
      const chunk = parts(va, T.p, need, 'aktiv').map(x => x.rest.join(' ') + ' ' + x.fin);
      const base = { solution: '<p>' + nb + ', ' + hs + '.</p><p>Hauptsatz im <b>' + NAME[main] + '</b> → das, was <b>vorher</b> passiert ist, steht im <b>' + NAME[need] + '</b>.</p>' };
      if (s.typed) return Object.assign(base, { prompt: 'Ergänze die richtige Zeitform:<br>' + em(gapNb + ', ' + hs + '.'), answers: chunk, show: chunk[0] });
      return Object.assign(base, { prompt: 'Welche Zeitform gehört in die Lücke?<br>' + em(gapNb + ', ' + hs + '.'), choices: ['Präsens', 'Präteritum', 'Perfekt', 'Plusquamperfekt'], answers: [NAME[need]], show: NAME[need] });
    },
    // Passiv: Verbteile eintippen
    passivBilden(r, s) {
      const v = pickVerb(r, x => x.tr), pl = r() < 0.4, p = pl ? 5 : 2, t = pick(listTenses(s), r);
      const subj = v.tr[pl ? 1 : 0], answers = verbChunk(v, p, t, 'passiv');
      return {
        prompt: 'Bilde das <b>Passiv ' + NAME[t] + '</b>:<br>' + em(subj + ' <span class="gap">_____</span> (' + v.inf + ').'), answers, show: answers[0],
        solution: '<p>' + FORMEL_P[t] + '.</p><p>' + sentences(v, p, subj, t, 'passiv', '')[0] + '</p>'
      };
    },
    // Passivsatz: Zeitform erkennen
    passivErkennen(r, s) {
      const v = pickVerb(r, x => x.tr), pl = r() < 0.4, p = pl ? 5 : 2, t = pick(listTenses(s), r);
      const sent = sentences(v, p, v.tr[pl ? 1 : 0], t, 'passiv', '')[0];
      return {
        prompt: 'Passiv – welche Zeitform?<br>' + em(sent), choices: TENSES.map(x => NAME[x]), answers: [NAME[t]], show: NAME[t],
        solution: '<p>' + FORMEL_P[t] + '.</p>'
      };
    },
    // Aktiv oder Passiv? (Futur I Aktiv und Passiv Präsens enthalten beide "werden")
    aktivPassiv(r) {
      const v = pickVerb(r, x => x.tr), t = pick(TENSES, r);
      let sent, ans;
      if (r() < 0.5) { const p = r() < 0.4 ? 5 : 2; sent = sentences(v, p, v.tr[p === 5 ? 1 : 0], t, 'passiv', '')[0]; ans = 'Passiv'; }
      else { const { p, subj } = person(r); sent = sentences(v, p, subj, t, 'aktiv')[0]; ans = 'Aktiv'; }
      return {
        prompt: 'Aktiv oder Passiv?<br>' + em(sent), choices: ['Aktiv', 'Passiv'], answers: [ans], show: ans,
        solution: '<p>' + (ans === 'Passiv' ? 'Passiv: <b>werden/sein + Partizip II</b> (+ worden). Wer etwas tut, ist nicht Subjekt.' : 'Aktiv: Das Subjekt tut selbst etwas.') + ' Zeitform: <b>' + NAME[t] + '</b>.</p>' +
          (t === 'futur1' && ans === 'Aktiv' ? '<p class="hint">Achtung: werden + <b>Infinitiv</b> = Futur I Aktiv. werden + <b>Partizip II</b> = Passiv.</p>' : '')
      };
    },
    // Futur II: Vermutung oder Zukunft?
    futur2Sinn(r) {
      const T = pick(F2, r);
      return {
        prompt: 'Was drückt das Futur II hier aus?<br>' + em(T.s), choices: ['Vermutung über Vergangenes', 'Abgeschlossen in Zukunft'], answers: [T.a], show: T.a,
        solution: '<p>' + T.e + '</p>'
      };
    }
  };

  const NACHDEM = [
    { s: 'Lena', pr: 'sie', p: 2, a: ['machen', 'die Hausübung'], b: ['gehen', 'ins Freie'] },
    { s: 'ich', pr: 'ich', p: 0, a: ['essen', 'eine Semmel'], b: ['fahren', 'zur Schule'] },
    { s: 'die Kinder', pr: 'sie', p: 5, a: ['aufstehen', 'um sieben Uhr'], b: ['laufen', 'zur Haltestelle'] },
    { s: 'wir', pr: 'wir', p: 3, a: ['lesen', 'das Buch'], b: ['sehen', 'den Film'] },
    { s: 'Jonas', pr: 'er', p: 2, a: ['anrufen', 'den Trainer'], b: ['bleiben', 'zu Hause'] },
    { s: 'du', pr: 'du', p: 1, a: ['lernen', 'die Vokabeln'], b: ['spielen', 'Fußball'] },
    { s: 'meine Eltern', pr: 'sie', p: 5, a: ['kaufen', 'Brot'], b: ['kochen', 'das Mittagessen'] },
    { s: 'ihr', pr: 'ihr', p: 4, a: ['schwimmen', 'im See'], b: ['liegen', 'in der Sonne'] },
    { s: 'Oma', pr: 'sie', p: 2, a: ['backen', 'den Kuchen'], b: ['anrufen', 'uns'] },
    { s: 'mein Bruder', pr: 'er', p: 2, a: ['putzen', 'sein Zimmer'], b: ['spielen', 'am Computer'] }
  ];
  const F2 = [
    { s: 'Jonas ist nicht da. Er wird den Bus verpasst haben.', a: 'Vermutung über Vergangenes', e: 'Der Bus ist schon weg – man <b>vermutet</b>, was passiert ist. Typisch: Futur II + Vermutung (= „hat wahrscheinlich …“).' },
    { s: 'Lena lacht so. Sie wird eine gute Note bekommen haben.', a: 'Vermutung über Vergangenes', e: 'Die Note gibt es schon – man <b>vermutet</b> nur. Gemeint: „Sie hat wohl eine gute Note bekommen.“' },
    { s: 'Die Straße ist nass. Es wird geregnet haben.', a: 'Vermutung über Vergangenes', e: 'Der Regen ist vorbei – man <b>schließt</b> darauf. Futur II als Vermutung.' },
    { s: 'Morgen um acht werde ich die Schularbeit geschrieben haben.', a: 'Abgeschlossen in Zukunft', e: '„Morgen um acht“ ist ein Zeitpunkt in der Zukunft; bis dahin ist die Handlung <b>abgeschlossen</b>.' },
    { s: 'Bis Freitag wird Oma den Pullover gestrickt haben.', a: 'Abgeschlossen in Zukunft', e: '„Bis Freitag“ = Zeitpunkt in der Zukunft, an dem alles <b>fertig</b> ist.' },
    { s: 'In zwei Stunden werden wir den Gipfel erreicht haben.', a: 'Abgeschlossen in Zukunft', e: '„In zwei Stunden“ liegt in der Zukunft – dann ist das Erreichen <b>abgeschlossen</b>.' },
    { s: 'Papa ist so müde. Er wird schlecht geschlafen haben.', a: 'Vermutung über Vergangenes', e: 'Das Schlafen war letzte Nacht – man <b>vermutet</b>.' },
    { s: 'Wenn du heimkommst, werde ich schon gekocht haben.', a: 'Abgeschlossen in Zukunft', e: 'Zum zukünftigen Zeitpunkt „wenn du heimkommst“ ist das Kochen <b>fertig</b>.' }
  ];

  function make(spec, r) { return Object.assign({ kind: spec.kind }, GEN[spec.kind](r, spec)); }
  const norm = s => String(s).toLowerCase().replace(/[.,!?;:„“”"'»«…_]/g, ' ').replace(/\s+/g, ' ').trim();
  function check(task, input) {
    const n = norm(input);
    if (!n) return { invalid: true, msg: 'Bitte zuerst eine Antwort eingeben.' };
    const ok = task.answers.some(a => norm(a.replace(/<[^>]+>/g, '')) === n);
    if (ok) return { ok: true };
    if (task.full && n.split(' ').length < 2) return { invalid: true, msg: 'Bitte den <b>ganzen Satz</b> schreiben.' };
    return { ok: false };
  }

  /* ---------- Zeitstrahl (inline SVG) ---------- */
  function zeitstrahl(hl) {
    const X = { plusquamperfekt: 70, praeteritum: 205, perfekt: 205, praesens: 340, futur2: 470, futur1: 570 };
    const lab = (k, y) => {
      const on = !hl || hl === k || (Array.isArray(hl) && hl.includes(k));
      return '<g opacity="' + (on ? 1 : .35) + '"><circle cx="' + X[k] + '" cy="60" r="' + (on ? 7 : 5) + '" fill="var(--accent)"/><text x="' + X[k] + '" y="' + y + '" text-anchor="middle" font-size="14" font-weight="' + (on ? 700 : 400) + '" fill="currentColor">' + NAME[k] + '</text></g>';
    };
    return '<svg viewBox="0 0 640 128" role="img" aria-label="Zeitstrahl der sechs Zeitformen" style="width:100%;max-width:640px;font-family:var(--sans);color:var(--ink)">' +
      '<line x1="20" y1="60" x2="620" y2="60" stroke="currentColor" stroke-width="2"/><path d="M620 60 l-10 -6 v12 z" fill="currentColor"/>' +
      '<line x1="340" y1="40" x2="340" y2="80" stroke="var(--blue)" stroke-width="3"/>' +
      '<text x="140" y="118" text-anchor="middle" font-size="13" fill="var(--muted)">Vergangenheit</text><text x="340" y="118" text-anchor="middle" font-size="13" fill="var(--blue)" font-weight="700">jetzt</text><text x="520" y="118" text-anchor="middle" font-size="13" fill="var(--muted)">Zukunft</text>' +
      lab('plusquamperfekt', 30) + lab('praeteritum', 22) + '<text x="205" y="40" text-anchor="middle" font-size="14" fill="currentColor" opacity="' + (!hl || hl === 'perfekt' || hl === 'praeteritum' || (Array.isArray(hl) && (hl.includes('perfekt') || hl.includes('praeteritum'))) ? 1 : .35) + '">Perfekt</text>' +
      lab('praesens', 30) + lab('futur2', 30) + lab('futur1', 30).replace('y="30"', 'y="92"') + '</svg>';
  }

  const api = { TENSES, NAME, PRON, VERBS, BY, AUX, presentForms, pastForms, parts, sentences, verbChunk, stammformen, rng, make, check, norm, zeitstrahl, GEN };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Zeiten = api;
})(this);
