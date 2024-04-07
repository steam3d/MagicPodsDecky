import { findModuleChild } from "decky-frontend-lib";
import { VFC, useEffect, useState } from "react";
import { Backend } from "./backend";
import { Button, Input } from "./input";

export interface Device {
    id: number;
    sName: string;
    bHasOutput: boolean;
    bIsDefaultOutputDevice: boolean;
    flOutputVolume: number;
    bHasInput: boolean;
    bIsDefaultInputDevice: boolean;
    flInputVolume: number;
}


export interface AudioDeviceInfo {
    activeOutputDeviceId: number;
    activeInputDeviceId: number;
    overrideOutputDeviceId: number;
    overrideInputDeviceId: number;
    vecDevices: Device[];
}

enum UIComposition {
    Hidden = 0,
    Notification = 1,
    Overlay = 2,
    Opaque = 3,
    OverlayKeyboard = 4,
}

const useUIComposition: (composition: UIComposition) => void = findModuleChild(
    (m) => {
        if (typeof m !== "object") return undefined;
        for (let prop in m) {
            if (
                typeof m[prop] === "function" &&
                m[prop].toString().includes("AddMinimumCompositionStateRequest") &&
                m[prop].toString().includes("ChangeMinimumCompositionStateRequest") &&
                m[prop].toString().includes("RemoveMinimumCompositionStateRequest") &&
                !m[prop].toString().includes("m_mapCompositionStateRequests")
            ) {
                return m[prop];
            }
        }
    }
);

export const MicrophoneMute: VFC = () => {
    useUIComposition(UIComposition.Notification);
    return (
        <div style={{
            height: "16px",
            width: "16px",
            opacity: 1,
            zIndex: 7002,
            position: "fixed",
            paddingTop: "1px",
            top: 0,
            right: 0
        }}
        >
            <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.79961 16.9472L12.0529 14.7005L22.0396 4.70719L20.6263 3.29385L15.9996 7.92049V5.36719C15.9996 4.30632 15.5782 3.28891 14.8281 2.53876C14.0779 1.78861 13.0605 1.36719 11.9996 1.36719C10.9387 1.36719 9.92134 1.78861 9.17121 2.53876C8.42108 3.28891 7.99961 4.30632 7.99961 5.36719V10.7005C8.00108 11.3722 8.17161 12.0326 8.49548 12.621C8.81941 13.2094 9.28621 13.7068 9.85294 14.0672L7.99961 15.8938C7.09908 15.1274 6.43732 14.1186 6.09297 12.9872L3.5663 13.7472C4.0375 15.2929 4.92832 16.6776 6.13964 17.7472L3.29297 20.6272L4.7063 22.0406L9.79961 16.9472Z" fill="#D4372B" />
                <path d="M12.2196 17.3338L9.82628 19.7205C10.1031 19.7946 10.3835 19.8547 10.6663 19.9005V22.6738H13.3329V19.9272C14.9772 19.6674 16.5151 18.95 17.7707 17.8572C19.0263 16.7642 19.9489 15.3399 20.4329 13.7472L17.8796 12.9872C17.4997 14.207 16.7519 15.2796 15.7386 16.0577C14.7253 16.8359 13.4962 17.2816 12.2196 17.3338Z" fill="#D4372B" />
            </svg>
        </div>
    )
}


let micId = -1;
let micSavedVolume = -1;
let volume_register: any;

export const BackgroundMicrophoneMute: VFC<{ backend: Backend }> = ({ backend }) => {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        backend.log("RegisterForInputChanged");
        const input = new Input([Button.QUICK_ACCESS_MENU, Button.L4]);
        input.onShortcutPressed(onShortcutPressed);

        backend.log("RegisterForDeviceVolumeChanged");
        // Mic changes
        volume_register = SteamClient.System.Audio.RegisterForDeviceVolumeChanged(
            (audioDeviceId: number, audioType: number, volume: number) => {
                if (audioDeviceId === micId && audioType === 0 && volume !== 0) {
                    micId = -1;
                    micSavedVolume = -1;
                    setVisible(false);
                    backend.log(`Changed: audioDeviceId ${audioDeviceId} audioType ${audioType} volume ${volume})`);
                }
            }
        );

        return () => {
            input.offShortcutPressed(onShortcutPressed);
            input.unregister();
        };
    }, []);

    const onShortcutPressed = async () => {
        const enableToggleMicValue = (await backend.deckyApi.callPluginMethod("load_setting", { key: "mic_qam_l5_toggle" })).result; //shortcut_mic_toggle when setup keys will be available
        if (!(String(enableToggleMicValue).toLowerCase() == "true")) {
            return;
        }

        if (micId === -1 && micSavedVolume === -1) {
            // Mic info
            const devices = await SteamClient.System.Audio.GetDevices() as AudioDeviceInfo;
            micId = devices.activeInputDeviceId;
            devices.vecDevices.forEach(dev => {
                if (dev.id === micId) {
                    micSavedVolume = dev.flInputVolume
                }
            });

            backend.log(devices);
            backend.log(`Saved: audioDeviceId ${micId} volume ${micSavedVolume})`);

            // Mute mic
            await SteamClient.System.Audio.SetDeviceVolume(micId, 0, 0);
            setVisible(true);
        }
        // Unmute mic
        else {
            await SteamClient.System.Audio.SetDeviceVolume(micId, 0, micSavedVolume);
        }
    }


    return (
        <>
            {visible &&
                <MicrophoneMute />
            }
        </>
    );
}
