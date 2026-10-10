// Run with `npm test`. lib/speech-voice.ts has no imports, so it is transpiled on the fly
// with the TypeScript compiler the app already depends on.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

function loadSpeechVoice() {
  const filePath = path.join(__dirname, '../lib/speech-voice.ts');
  const { outputText } = ts.transpileModule(fs.readFileSync(filePath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const compiled = { exports: {} };
  new Function('module', 'exports', outputText)(compiled, compiled.exports);
  return compiled.exports;
}

const { defaultVoiceKey, describeVoicesForLocale, selectSpeechVoice, usableVoicesForLocale } =
  loadSpeechVoice();

const voice = (identifier, language, extra = {}) => ({ identifier, language, ...extra });

test('uses the engine default when the exact locale has an installed voice', () => {
  const voices = [voice('es-ES-a', 'es-ES'), voice('es-US-a', 'es-US')];
  assert.equal(selectSpeechVoice(voices, 'es-ES'), undefined);
});

test('Spanish (Spain) missing but another Spanish voice exists: falls back to it', () => {
  // The Galaxy S21 case: Spanish (United States) installed, app requests es-ES.
  const voices = [voice('en-US-a', 'en-US'), voice('es-US-a', 'es-US'), voice('zh-CN-a', 'zh-CN')];
  assert.equal(selectSpeechVoice(voices, 'es-ES'), 'es-US-a');
});

test('preferred voice listed but its data is not installed: falls back to an installed one', () => {
  const voices = [voice('es-ES-a', 'es-ES', { installed: false }), voice('es-US-a', 'es-US', { installed: true })];
  assert.equal(selectSpeechVoice(voices, 'es-ES'), 'es-US-a');
});

test('locale fallback prefers an offline voice over one that needs the network', () => {
  const voices = [
    voice('es-US-network', 'es-US', { requiresNetwork: true }),
    voice('es-MX-local', 'es-MX', { requiresNetwork: false }),
  ];
  assert.equal(selectSpeechVoice(voices, 'es-ES'), 'es-MX-local');
});

test('locale fallback accepts a language-only voice and underscore locales', () => {
  assert.equal(selectSpeechVoice([voice('es-generic', 'es')], 'es-ES'), 'es-generic');
  assert.equal(selectSpeechVoice([voice('es-US-a', 'es_US')], 'es-ES'), 'es-US-a');
});

test('no voice of the language, or no voice list at all: leaves it to the engine', () => {
  assert.equal(selectSpeechVoice([voice('en-US-a', 'en-US')], 'es-ES'), undefined);
  assert.equal(selectSpeechVoice([], 'es-ES'), undefined);
});

test('Chinese still uses the engine default when a zh-CN voice is installed', () => {
  const voices = [voice('zh-CN-a', 'zh-CN'), voice('zh-TW-a', 'zh-TW'), voice('zh-HK-a', 'zh-HK')];
  assert.equal(selectSpeechVoice(voices, 'zh-CN'), undefined);
  assert.equal(selectSpeechVoice(voices, 'zh-TW'), undefined);
});

test('Mandarin never falls back to a Cantonese voice', () => {
  assert.equal(selectSpeechVoice([voice('zh-HK-a', 'zh-HK')], 'zh-CN'), undefined);
  assert.equal(selectSpeechVoice([voice('zh-HK-a', 'zh-HK'), voice('zh-TW-a', 'zh-TW')], 'zh-CN'), 'zh-TW-a');
  assert.deepEqual(usableVoicesForLocale([voice('zh-HK-a', 'zh-HK')], 'zh-HK').length, 1);
});

test('engine default failed to start: tries an explicit voice, same locale first', () => {
  const voices = [voice('es-US-a', 'es-US'), voice('es-ES-a', 'es-ES'), voice('es-ES-b', 'es-ES')];
  const failed = new Set([defaultVoiceKey('es-ES')]);
  assert.equal(selectSpeechVoice(voices, 'es-ES', failed), 'es-ES-a');
  failed.add('es-ES-a');
  assert.equal(selectSpeechVoice(voices, 'es-ES', failed), 'es-ES-b');
  failed.add('es-ES-b');
  assert.equal(selectSpeechVoice(voices, 'es-ES', failed), 'es-US-a');
  failed.add('es-US-a');
  assert.equal(selectSpeechVoice(voices, 'es-ES', failed), undefined);
});

test('a failure in one language does not change voice selection for another', () => {
  const voices = [voice('es-ES-a', 'es-ES'), voice('zh-CN-a', 'zh-CN')];
  const failed = new Set([defaultVoiceKey('es-ES'), 'es-ES-a']);
  assert.equal(selectSpeechVoice(voices, 'zh-CN', failed), undefined);
});

test('voice availability check ignores voices whose data is not installed', () => {
  const voices = [voice('es-ES-a', 'es-ES', { installed: false }), voice('en-US-a', 'en-US')];
  assert.equal(usableVoicesForLocale(voices, 'es-ES').length, 0);
  assert.equal(usableVoicesForLocale([voice('es-US-a', 'es-US')], 'es-ES').length, 1);
});

test('diagnostic summary lists every voice of the language with its state', () => {
  const voices = [
    voice('es-ES-a', 'es-ES', { installed: false }),
    voice('es-US-net', 'es-US', { requiresNetwork: true }),
    voice('en-US-a', 'en-US'),
  ];
  assert.equal(
    describeVoicesForLocale(voices, 'es-ES'),
    'es-ES-a|es-ES|not_installed|local, es-US-net|es-US|installed|network',
  );
});
