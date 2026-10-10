// Keep the Android speech fix attached to the exact Expo version used by this app.
// EAS runs postinstall before compiling the native module.
const fs = require('node:fs');
const path = require('node:path');

const SUPPORTED_VERSION = '14.0.8';
const ANDROID_SOURCE_DIR = 'android/src/main/java/expo/modules/speech';

let source = '';

function replaceOnce(original, replacement) {
  if (source.includes(replacement)) return;
  if (!source.includes(original)) {
    throw new Error(
      `expo-speech source changed near: ${original.slice(0, 70)}\n` +
        'If an older version of this patch was applied, reinstall the package first: ' +
        'rm -rf node_modules/expo-speech && npm install'
    );
  }
  source = source.replace(original, () => replacement);
}

function patchFile(packageRoot, fileName, applyEdits) {
  const filePath = path.join(packageRoot, ANDROID_SOURCE_DIR, fileName);
  source = fs.readFileSync(filePath, 'utf8');
  applyEdits();
  fs.writeFileSync(filePath, source);
}

// An explicit voice is how lib/audio.ts falls back to another installed voice of the same
// language (e.g. es-US when es-ES has no voice data), so it is not gated on the requested
// locale. Without one, the requested locale must be usable or the failure is reported.
const PATCHED_SPEAK_OUT = [
  '  private fun speakOut(id: String, text: String, options: SpeechOptions) {',
  '    options.pitch?.let(textToSpeech::setPitch)',
  '    options.rate?.let(textToSpeech::setSpeechRate)',
  '',
  '    val explicitVoice = options.voice?.let { voiceName ->',
  '      runCatching { textToSpeech.voices }.getOrNull()?.firstOrNull { it.name == voiceName }',
  '    }',
  '    var availability: Int? = null',
  '    var setLanguageResult: Int? = null',
  '    var setVoiceResult: Int? = null',
  '',
  '    if (explicitVoice != null) {',
  '      val voiceResult = textToSpeech.setVoice(explicitVoice)',
  '      setVoiceResult = voiceResult',
  '      if (voiceResult != TextToSpeech.SUCCESS) {',
  '        sendSpeechDiagnostic(id, "set_voice_failed", options.language, null, null, null, voiceResult)',
  '        sendSpeechError(id, "Cannot select voice: ${options.voice} (status $voiceResult)")',
  '        return',
  '      }',
  '    } else {',
  '      val requestedLocale = options.language?.let(Locale::forLanguageTag) ?: Locale.getDefault()',
  '      val available = textToSpeech.isLanguageAvailable(requestedLocale)',
  '      availability = available',
  '      if (available < TextToSpeech.LANG_AVAILABLE) {',
  '        sendSpeechDiagnostic(id, "language_unavailable", options.language, available, null, null)',
  '        sendSpeechError(id, "Requested voice unavailable: ${options.language} (status $available)")',
  '        return',
  '      }',
  '',
  '      val languageResult = textToSpeech.setLanguage(requestedLocale)',
  '      setLanguageResult = languageResult',
  '      if (languageResult < TextToSpeech.LANG_AVAILABLE) {',
  '        sendSpeechDiagnostic(id, "set_language_failed", options.language, available, languageResult, null)',
  '        sendSpeechError(id, "Cannot select voice: ${options.language} (status $languageResult)")',
  '        return',
  '      }',
  '    }',
  '',
  '    val speakResult = textToSpeech.speak(text, TextToSpeech.QUEUE_ADD, null, id)',
  '    sendSpeechDiagnostic(id, "speak_queued", options.language, availability, setLanguageResult, speakResult, setVoiceResult)',
  '    if (speakResult != TextToSpeech.SUCCESS) {',
  '      sendSpeechError(id, "TTS engine rejected speak request (status $speakResult)")',
  '    }',
  '  }',
  '',
  '  private fun sendSpeechError(id: String, message: String) {',
  '    sendEvent(speakingErrorEvent, Bundle().apply {',
  '      putString("id", id)',
  '      putString("error", message)',
  '    })',
  '  }',
  '',
  '  private fun sendSpeechDiagnostic(',
  '    id: String, phase: String, requestedLocale: String?, availability: Int?,',
  '    setLanguageResult: Int?, speakResult: Int?, setVoiceResult: Int? = null',
  '  ) {',
  '    sendEvent(speakingDiagnosticEvent, Bundle().apply {',
  '      putString("id", id)',
  '      putString("phase", phase)',
  '      putString("requestedLocale", requestedLocale)',
  '      putString("engine", textToSpeech.defaultEngine)',
  '      putString("selectedLocale", textToSpeech.voice?.locale?.toLanguageTag())',
  '      putString("selectedVoice", textToSpeech.voice?.name)',
  '      availability?.let { putInt("availability", it) }',
  '      setLanguageResult?.let { putInt("setLanguageResult", it) }',
  '      setVoiceResult?.let { putInt("setVoiceResult", it) }',
  '      speakResult?.let { putInt("speakResult", it) }',
  '    })',
  '  }',
].join('\n');

function applyPatch(packageRoot) {
  const version = require(path.join(packageRoot, 'package.json')).version;
  if (version !== SUPPORTED_VERSION) {
    throw new Error(`Review the Android speech patch for expo-speech ${version}`);
  }

  // Tell JS which voices actually have data on the device so it can pick a usable one.
  patchFile(packageRoot, 'VoiceRecord.kt', () => {
    replaceOnce(
      '  @Field val language: String\n) : Record',
      '  @Field val language: String,\n  @Field val installed: Boolean,\n  @Field val requiresNetwork: Boolean\n) : Record'
    );
  });

  patchFile(packageRoot, 'SpeechModule.kt', () => {
    replaceOnce(
      '        language = LanguageUtils.getISOCode(it.locale)\n      )',
      [
        '        // expo\'s ISO lookup throws for locales it does not know (3-letter codes such as yue-HK).',
        '        language = runCatching { LanguageUtils.getISOCode(it.locale) }.getOrElse { _ -> it.locale.toLanguageTag() },',
        '        installed = it.features?.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED) != true,',
        '        requiresNetwork = it.isNetworkConnectionRequired',
        '      )',
      ].join('\n')
    );
    replaceOnce(
      'const val speakingErrorEvent = "Exponent.speakingError"',
      'const val speakingErrorEvent = "Exponent.speakingError"\nconst val speakingDiagnosticEvent = "Exponent.speakingDiagnostic"'
    );
    replaceOnce(
      '      speakingStoppedEvent,\n      speakingErrorEvent',
      '      speakingStoppedEvent,\n      speakingErrorEvent,\n      speakingDiagnosticEvent'
    );
    replaceOnce(
      '    AsyncFunction<Unit>("stop") {\n      textToSpeech.stop()\n    }',
      '    AsyncFunction<Unit>("stop") {\n      for (utterance in delayedUtterances) {\n        sendEvent(speakingStoppedEvent, idToMap(utterance.id))\n        sendEvent(speakingDiagnosticEvent, Bundle().apply {\n          putString("id", utterance.id)\n          putString("phase", "stopped_before_init")\n        })\n      }\n      delayedUtterances.clear()\n      textToSpeech.stop()\n    }'
    );
    replaceOnce(
      '  private fun speakOut(id: String, text: String, options: SpeechOptions) {\n    options.pitch?.let(textToSpeech::setPitch)\n    options.rate?.let(textToSpeech::setSpeechRate)\n\n    textToSpeech.language = options.language?.let {\n      val locale = Locale(it)\n      val languageAvailable = textToSpeech.isLanguageAvailable(locale)\n\n      return@let if (\n        languageAvailable != TextToSpeech.LANG_MISSING_DATA &&\n        languageAvailable != TextToSpeech.LANG_NOT_SUPPORTED\n      ) {\n        locale\n      } else {\n        Locale.getDefault()\n      }\n    } ?: Locale.getDefault()\n\n    options.voice?.let { voiceName ->\n      textToSpeech.voices\n        .firstOrNull { it.name == voiceName }\n        ?.let(textToSpeech::setVoice)\n    }\n\n    textToSpeech.speak(\n      text,\n      TextToSpeech.QUEUE_ADD,\n      null,\n      id\n    )\n  }',
      PATCHED_SPEAK_OUT
    );
    replaceOnce(
      '            override fun onStop(utteranceId: String, interrupted: Boolean) {\n              sendEvent(speakingStoppedEvent, idToMap(utteranceId))\n            }\n\n            override fun onError(utteranceId: String) {\n              sendEvent(speakingErrorEvent, idToMap(utteranceId))\n            }',
      '            override fun onStop(utteranceId: String, interrupted: Boolean) {\n              sendEvent(speakingStoppedEvent, idToMap(utteranceId))\n              sendEvent(speakingDiagnosticEvent, Bundle().apply {\n                putString("id", utteranceId)\n                putString("phase", "stopped")\n                putBoolean("interrupted", interrupted)\n              })\n            }\n\n            override fun onError(utteranceId: String) {\n              sendSpeechError(utteranceId, "TTS engine error")\n            }\n\n            override fun onError(utteranceId: String, errorCode: Int) {\n              sendSpeechError(utteranceId, "TTS engine error code $errorCode")\n            }'
    );
    replaceOnce(
      '      }\n    }\n    _textToSpeech = newTtsInstance',
      '      } else {\n        sendEvent(speakingDiagnosticEvent, Bundle().apply {\n          putString("phase", "init_failed")\n          putInt("initStatus", status)\n        })\n        for (utterance in delayedUtterances) {\n          sendSpeechError(utterance.id, "TTS engine initialization failed (status $status)")\n        }\n        delayedUtterances.clear()\n      }\n    }\n    _textToSpeech = newTtsInstance'
    );
    replaceOnce(
      '          for ((id, text, options) in delayedUtterances) {\n            speakOut(id, text, options)\n          }\n          for (promise in delayedGetVoices)',
      '          for ((id, text, options) in delayedUtterances) {\n            speakOut(id, text, options)\n          }\n          delayedUtterances.clear()\n          for (promise in delayedGetVoices)'
    );
  });
}

module.exports = { applyPatch };

if (require.main === module) {
  applyPatch(path.dirname(require.resolve('expo-speech/package.json')));
  console.log('Applied Android expo-speech locale and diagnostics patch');
}
