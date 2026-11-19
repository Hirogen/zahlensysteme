#!/usr/bin/env node
/* check-engine.js – Schnelltest der Rechen-Engines (zahlen.js, mathe.js, terme.js, zeiten.js).
   Aufruf:  node tools/check-engine.js        → Exit-Code 1 bei einem Fehler.
   1) Einzelfälle: bekannte Ein-/Ausgaben pro Engine.
   2) Generatoren: jede GEN-Art × mehrere Seeds erzeugt eine Aufgabe ohne Fehler,
      gleicher Seed = gleiche Aufgabe, und die gespeicherte Lösung besteht check(). */
'use strict';
const path = require('path');
const assert = require('assert/strict');
const R = p => require(path.join(__dirname, '..', p));

const Z = R('assets/zahlen.js');
const M = R('mathe/sa1/assets/mathe.js');
const T = R('mathe/ahs4-sa1/assets/terme.js');
const D = R('deutsch/zeiten/assets/zeiten.js');

let fails = 0, passes = 0;
function test(name, fn) {
  try { fn(); passes++; } catch (e) { fails++; console.log('FAIL ' + name + '\n     ' + String(e.message).split('\n')[0]); }
}
const big = (k, v) => (typeof v === 'bigint' ? v.toString() + 'n' : v);
const json = x => JSON.stringify(x, big);
const strip = s => String(s).replace(/<[^>]+>/g, '');

/* ---------- 1) Einzelfälle ---------- */
test('Zahlen.fmt', () => {
  assert.equal(Z.fmt(255, 16), 'FF');
  assert.equal(Z.fmt(10, 2), '1010');
  assert.equal(Z.fmt(0, 7), '0');
  assert.equal(Z.fmt(3657, 50), '(1)(23)(7)'); // Basis > 36: Ziffern in Klammern
});
test('Zahlen.parse', () => {
  assert.equal(Z.parse('ff', 16).value, 255);
  assert.equal(Z.parse('1011 0101', 2).value, 181);
  assert.equal(Z.parse('(1)(23)(7)', 50).value, 3657);
  assert.equal(Z.parse('19', 8).ok, false); // 9 ist keine Oktalziffer
  assert.equal(Z.parse('', 10).ok, false);
});
test('Mathe: Bruchrechnung', () => {
  assert.ok(M.eq(M.add(M.Q(1, 2), M.Q(1, 3)), M.Q(5, 6)));
  assert.ok(M.eq(M.pow(M.Q(2), -3), M.Q(1, 8)));
  assert.ok(M.eq(M.Q(2, -4), M.Q(-1, 2))); // kürzt, Vorzeichen in den Zähler
});
test('Mathe.parseNum', () => {
  assert.ok(M.eq(M.parseNum('3/4'), M.Q(3, 4)));
  assert.ok(M.eq(M.parseNum('0,0028'), M.Q(28, 10000)));
  assert.ok(M.eq(M.parseNum('2,8·10^-3'), M.Q(28, 10000)));
  assert.ok(M.eq(M.parseNum('10^-3'), M.Q(1, 1000)));
  assert.ok(M.eq(M.parseNum('-12'), M.Q(-12)));
});
test('Mathe.fmt / sci', () => {
  assert.equal(M.fmt(M.Q(28, 10000)), '0,0028');
  assert.equal(strip(M.sci(M.Q(28, 10000))), '2,8·10−3');
});
test('Terme.sqf (√n = k·√r)', () => {
  assert.equal(json(T.sqf(72n)), json({ k: 6n, r: 2n }));
  assert.equal(json(T.sqf(49n)), json({ k: 7n, r: 1n }));
  assert.equal(json(T.sqf(30n)), json({ k: 1n, r: 30n }));
});
test('Terme: Polynome / binomische Formeln', () => {
  const P = s => T.evalP(T.parse(s));
  assert.ok(T.pEq(P('(a+b)^2'), P('a^2+2ab+b^2')));
  assert.ok(T.pEq(P('(3x-2)^2'), P('9x^2-12x+4')));
  assert.ok(T.pEq(P('(x+1)(x-1)'), P('x^2-1')));
  assert.ok(!T.pEq(P('(a+b)^2'), P('a^2+b^2')));
});
test('Terme.parseInterval', () => {
  assert.ok(T.ivEq(T.parseInterval(']2; 5]'), T.parseInterval(']2;5]')));
  assert.ok(!T.ivEq(T.parseInterval(']2; 5]'), T.parseInterval('[2; 5]')));
});
test('Zeiten: Formen', () => {
  const v = D.VERBS.find(x => x.inf === 'machen');
  assert.deepEqual(D.presentForms(v), ['mache', 'machst', 'macht', 'machen', 'macht', 'machen']);
  assert.equal(D.stammformen(v), 'machen – machte – hat gemacht');
  assert.equal(D.TENSES.length, 6);
});
test('Zeiten.check', () => {
  const t = { answers: ['Wir haben ein Baumhaus gebaut.'], full: true };
  assert.equal(D.check(t, 'wir haben ein baumhaus gebaut').ok, true);
  assert.equal(D.check(t, 'Wir bauten ein Baumhaus.').ok, false);
  assert.equal(D.check(t, '').invalid, true);
});

/* ---------- 2) Generatoren ---------- */
/* Eingabe, die die gespeicherte Lösung so tippt, wie ein Schüler es täte.
   null = für diesen Modus kein einfacher Rückweg → nur Erzeugung prüfen. */
const qStr = q => (q.d === 1n ? q.n.toString() : q.n.toString() + '/' + q.d.toString());
const INPUT = {
  Zahlen: t => t.choices ? t.answer : t.exact !== undefined ? t.exact : t.decimal !== undefined ? t.answerShow : Z.fmt(t.answer, t.answerBase),
  Mathe: t => t.mode === 'choice' ? t.correct : t.mode === 'num' ? qStr(t.ans) : null,
  Terme: t => t.mode === 'choice' ? t.correct : t.mode === 'multi' ? t.correct : t.mode === 'num' ? qStr(t.ans) : null,
  Zeiten: t => strip(t.answers[0]),
};
const ENGINES = { Zahlen: Z, Mathe: M, Terme: T, Zeiten: D };
const SEEDS = [1, 2, 3, 101, 202, 303, 404, 777];
let roundTrips = 0;
for (const [name, E] of Object.entries(ENGINES)) {
  for (const kind of Object.keys(E.GEN)) {
    test(name + '.GEN.' + kind, () => {
      for (const seed of SEEDS) {
        const a = E.make({ kind }, E.rng(seed)), b = E.make({ kind }, E.rng(seed));
        assert.equal(json(a), json(b), 'Seed ' + seed + ' nicht deterministisch');
        assert.ok(a.prompt, 'Seed ' + seed + ': keine prompt');
        const input = INPUT[name](a);
        if (input === null) continue;
        const res = E.check(a, input);
        assert.ok(res.ok, 'Seed ' + seed + ': eigene Lösung ' + json(input) + ' → ' + json(res));
        roundTrips++;
      }
    });
  }
}

console.log((fails ? 'FAILED' : 'OK') + ': ' + passes + ' bestanden, ' + fails + ' fehlgeschlagen (' + roundTrips + ' Lösungen gegen check() geprüft).');
process.exit(fails ? 1 : 0);
