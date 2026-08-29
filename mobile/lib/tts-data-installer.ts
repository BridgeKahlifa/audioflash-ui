import { requireOptionalNativeModule } from "expo-modules-core";

type TtsDataInstallerModule = {
  launchInstallTtsDataAsync(): Promise<void>;
};

const nativeModule = requireOptionalNativeModule<TtsDataInstallerModule>("TtsDataInstaller");

export async function launchTtsDataInstallerAsync(): Promise<void> {
  if (!nativeModule) {
    throw new Error("The Android TTS data installer is unavailable in this build.");
  }
  await nativeModule.launchInstallTtsDataAsync();
}
