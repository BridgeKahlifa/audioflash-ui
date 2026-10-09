// Keep the Android speech fix attached to the exact Expo version used by this app.
// EAS runs postinstall before compiling the native module.
const fs = require('node:fs');
const path = require('node:path');

const packageRoot = path.dirname(require.resolve('expo-speech/package.json'));
const version = require(path.join(packageRoot, 'package.json')).version;
if (version !== '14.0.8') {
  throw new Error(`Review the Android speech patch for expo-speech ${version}`);
}

const modulePath = path.join(packageRoot, 'android/src/main/java/expo/modules/speech/SpeechModule.kt');
let source = fs.readFileSync(modulePath, 'utf8');

function replaceOnce(original, replacement) {
  if (source.includes(replacement)) return;
  if (!source.includes(original)) throw new Error(`expo-speech source changed near: ${original.slice(0, 70)}`);
  source = source.replace(original, replacement);
}

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
  '  private fun speakOut(id: String, text: String, options: SpeechOptions) {\n    options.pitch?.let(textToSpeech::setPitch)\n    options.rate?.let(textToSpeech::setSpeechRate)\n\n    val requestedLocale = options.language?.let(Locale::forLanguageTag) ?: Locale.getDefault()\n    val availability = textToSpeech.isLanguageAvailable(requestedLocale)\n    if (availability < TextToSpeech.LANG_AVAILABLE) {\n      sendSpeechDiagnostic(id, "language_unavailable", options.language, availability, null, null)\n      sendSpeechError(id, "Requested voice unavailable: ${options.language} (status $availability)")\n      return\n    }\n\n    val setLanguageResult = textToSpeech.setLanguage(requestedLocale)\n    if (setLanguageResult < TextToSpeech.LANG_AVAILABLE) {\n      sendSpeechDiagnostic(id, "set_language_failed", options.language, availability, setLanguageResult, null)\n      sendSpeechError(id, "Cannot select voice: ${options.language} (status $setLanguageResult)")\n      return\n    }\n\n    options.voice?.let { voiceName ->\n      textToSpeech.voices\n        .firstOrNull { it.name == voiceName }\n        ?.let(textToSpeech::setVoice)\n    }\n\n    val speakResult = textToSpeech.speak(text, TextToSpeech.QUEUE_ADD, null, id)\n    sendSpeechDiagnostic(id, "speak_queued", options.language, availability, setLanguageResult, speakResult)\n    if (speakResult != TextToSpeech.SUCCESS) {\n      sendSpeechError(id, "TTS engine rejected speak request (status $speakResult)")\n    }\n  }\n\n  private fun sendSpeechError(id: String, message: String) {\n    sendEvent(speakingErrorEvent, Bundle().apply {\n      putString("id", id)\n      putString("error", message)\n    })\n  }\n\n  private fun sendSpeechDiagnostic(\n    id: String, phase: String, requestedLocale: String?, availability: Int?,\n    setLanguageResult: Int?, speakResult: Int?\n  ) {\n    sendEvent(speakingDiagnosticEvent, Bundle().apply {\n      putString("id", id)\n      putString("phase", phase)\n      putString("requestedLocale", requestedLocale)\n      putString("engine", textToSpeech.defaultEngine)\n      putString("selectedLocale", textToSpeech.language?.toLanguageTag())\n      putString("selectedVoice", textToSpeech.voice?.name)\n      availability?.let { putInt("availability", it) }\n      setLanguageResult?.let { putInt("setLanguageResult", it) }\n      speakResult?.let { putInt("speakResult", it) }\n    })\n  }'
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

fs.writeFileSync(modulePath, source);
console.log('Applied Android expo-speech locale and diagnostics patch');
