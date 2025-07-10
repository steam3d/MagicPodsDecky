import { Backend } from "./backend"
import { AudioDeviceInfo } from "./bgMicMute";
import { headphoneInfoProps } from "./tab/tabInfo"

export class ConversationAwarenessVolume {

    private savedVolume = -1;

    async process(info: headphoneInfoProps, backend: Backend) {

        const speaking = info?.capabilities?.conversationAwarenessSpeaking?.selected;
        if (speaking == null)
            return;

        const devices = await SteamClient.System.Audio.GetDevices() as AudioDeviceInfo;
        const id = devices.activeOutputDeviceId;

        let volume = -1;
        devices.vecDevices.forEach(dev => {
            if (dev.id === id) {
                volume = dev.flOutputVolume;
                backend.logDebug(dev.flOutputVolume);
            }
        });

        if (volume == -1) {
            backend.logError("Failed to get volume level");
            return;
        }

        if (speaking === true) {
            if (this.savedVolume == -1) {
                let percent = await backend.loadNumberSetting("conversation_awareness_volume") ?? 0;

                if (percent == 0)
                    return;

                await SteamClient.System.Audio.SetDeviceVolume(id, 1, volume * ((100-percent) * 0.01));
                this.savedVolume = volume;

            }
        } else if (speaking === false) {
            if (this.savedVolume != -1) {
                await SteamClient.System.Audio.SetDeviceVolume(id, 1, this.savedVolume);
                this.savedVolume = -1;
            }
        }
    }
}