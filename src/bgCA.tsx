import { Backend } from "./backend"
import { AudioDeviceInfo } from "./bgMicMute";
import { headphoneInfoProps } from "./tab/tabInfo"

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class ConversationAwarenessVolume {

    private savedVolume = -1;
    private lastSpeaking: boolean | null = null;

    async process(info: headphoneInfoProps, backend: Backend) {

        const speaking = info?.capabilities?.conversationAwarenessSpeaking?.selected;
        if (speaking == null)
            return;
                
        if (this.lastSpeaking === speaking)
            return;

        this.lastSpeaking = speaking;

        const devices = await SteamClient.System.Audio.GetDevices() as AudioDeviceInfo;
        const id = devices.activeOutputDeviceId;

        let volume = -1;
        devices.vecDevices.forEach(dev => {
            if (dev.id === id) {
                volume = dev.flOutputVolume;
                backend.logDebug("Output device volume:", dev.flOutputVolume);
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

                //await SteamClient.System.Audio.SetDeviceVolume(id, 1, volume * ((100-percent) * 0.01));
                const targetVolume = volume * ((100-percent) * 0.01);
                await this.fadeVolume(volume, targetVolume, id, backend);
                this.savedVolume = volume;

            }
        } else if (speaking === false) {
            if (this.savedVolume != -1) {
                //await SteamClient.System.Audio.SetDeviceVolume(id, 1, this.savedVolume);
                await this.fadeVolume(volume, this.savedVolume, id, backend);
                this.savedVolume = -1;
            }
        }
    }

    private async fadeVolume(from: number, to: number, deviceId: number, backend: Backend, steps = 10, delayMs = 25) {
        const stepSize = (to - from) / steps;
        backend.logDebug("New volume:", to, "StepsSize:", stepSize);
        
        for (let i = 1; i <= steps; i++) {
            const current = from + stepSize * i;
            await SteamClient.System.Audio.SetDeviceVolume(deviceId, 1, current);
            //backend.logDebug(`Step ${i}: Volume ${current.toFixed(3)}`);
            await delay(delayMs);
        }
    }

    reset(){
        this.lastSpeaking = null;
        this.savedVolume = -1;
    }
}