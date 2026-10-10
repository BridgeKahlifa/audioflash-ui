const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { applyPatch } = require('../scripts/patch-expo-speech.cjs');

const SOURCE_DIR = 'android/src/main/java/expo/modules/speech';

function copyExpoSpeech() {
  const installed = path.dirname(require.resolve('expo-speech/package.json'));
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-speech-'));
  fs.copyFileSync(path.join(installed, 'package.json'), path.join(copy, 'package.json'));
  fs.cpSync(path.join(installed, SOURCE_DIR), path.join(copy, SOURCE_DIR), { recursive: true });
  return copy;
}

const read = (root, fileName) => fs.readFileSync(path.join(root, SOURCE_DIR, fileName), 'utf8');

test('patch applies to the installed expo-speech and is idempotent', () => {
  const root = copyExpoSpeech();
  applyPatch(root);
  const moduleSource = read(root, 'SpeechModule.kt');
  const voiceRecord = read(root, 'VoiceRecord.kt');

  // Voices report whether their data is installed, so JS can pick a usable one.
  assert.match(voiceRecord, /@Field val installed: Boolean/);
  assert.match(moduleSource, /KEY_FEATURE_NOT_INSTALLED/);
  // An explicit voice is applied without gating on the requested locale.
  assert.match(moduleSource, /textToSpeech\.setVoice\(explicitVoice\)/);
  // Failures are reported instead of silently speaking nothing.
  assert.match(moduleSource, /"language_unavailable"/);
  assert.match(moduleSource, /"set_voice_failed"/);
  assert.match(moduleSource, /"init_failed"/);
  assert.match(moduleSource, /override fun onError\(utteranceId: String, errorCode: Int\)/);
  // The stock locale handling (Locale("es-ES") with a silent fallback) is gone.
  assert.doesNotMatch(moduleSource, /Locale\(it\)/);

  applyPatch(root);
  assert.equal(read(root, 'SpeechModule.kt'), moduleSource);
  assert.equal(read(root, 'VoiceRecord.kt'), voiceRecord);
});

test('patch refuses an expo-speech version it was not written for', () => {
  const root = copyExpoSpeech();
  const packagePath = path.join(root, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  fs.writeFileSync(packagePath, JSON.stringify({ ...pkg, version: '99.0.0' }));
  assert.throws(() => applyPatch(root), /Review the Android speech patch/);
});
