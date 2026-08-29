package com.audioflash.ttsdatainstaller

import android.content.Intent
import android.speech.tts.TextToSpeech
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class TtsDataInstallerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("TtsDataInstaller")

    AsyncFunction("launchInstallTtsDataAsync") {
      val activity = appContext.currentActivity
        ?: throw IllegalStateException("No foreground Android activity is available.")
      activity.startActivity(Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA))
    }
  }
}
