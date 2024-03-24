import { Router, findModuleChild } from "decky-frontend-lib";
import { VFC, useEffect, useState } from "react";
import { ULKeys, ULUpperKeys, isPressed } from "./keys";
import { Backend } from "./backend";

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

let micId = -1;
let micSavedVolume = -1;
let volume_register: any;

export const MicrophoneOverlay: VFC<{ backend: Backend }> = ({ backend }) => {
    const [visible, setVisible] = useState(false);
    useUIComposition(visible ? UIComposition.Notification : UIComposition.Hidden);

    let keyPressingTime = Date.now();
    let keyPressed = false;
    let qamPressed = false;

    useEffect(() => {
        const input_register = window.SteamClient.Input.RegisterForControllerStateChanges(
            async (changes: any[]) => {
                for (const inputs of changes) {
                    if (isPressed(ULUpperKeys.QAM, inputs.ulUpperButtons) && isPressed(ULKeys.L5, inputs.ulButtons)) {
                        if (keyPressed != true && Date.now() - keyPressingTime > 350) {
                            
                            const enableToggleMicValue = (await backend.deckyApi.callPluginMethod("load_setting", { key: "mic_qam_l5_toggle" })).result; //shortcut_mic_toggle when setup keys will be available
                            if (!(String(enableToggleMicValue).toLowerCase() == "true")){
                                return;
                            }                           
                            
                            // Keys
                            (Router as any).DisableHomeAndQuickAccessButtons();
                            keyPressingTime = Date.now();
                            keyPressed = true;
                            qamPressed = true;

                            // Mute mic
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

                                // Set mic volume
                                await SteamClient.System.Audio.SetDeviceVolume(micId, 0, 0);
                                setVisible(true);
                            }
                            // Unmute mic
                            else {
                                await SteamClient.System.Audio.SetDeviceVolume(micId, 0, micSavedVolume);
                            }
                        }
                    }
                    else {
                        if (qamPressed != false && !isPressed(ULUpperKeys.QAM, inputs.ulUpperButtons)) {
                            qamPressed = false;
                            setTimeout(() => {
                                (Router as any).EnableHomeAndQuickAccessButtons();
                                //backend.log("Enable QAM")
                            }, 350);
                        }
                        if (keyPressed != false) {
                            //backend.log("Button release")                             
                            keyPressed = false;
                        }
                    }
                }
            }
        );

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
            input_register.unregister();
        };
    }, []);


    return (
        <>
            {visible &&
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
                    {/* <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M1.27629 19.664C0.885767 20.0545 0.885767 20.6877 1.27629 21.0782C1.66682 21.4687 2.29998 21.4687 2.6905 21.0782L21.0753 2.69343C21.4658 2.30291 21.4658 1.66975 21.0753 1.27922C20.6848 0.888697 20.0516 0.888697 19.6611 1.27922L16.2233 4.71697C15.5856 3.12558 14.013 2.00001 12.1746 2.00001H11.8249C9.42151 2.00001 7.47343 3.92374 7.47343 6.29707V10.9203C7.47343 11.6548 7.66012 12.3463 7.98922 12.9511L6.55042 14.3899C5.84769 13.3581 5.43728 12.1169 5.43728 10.7829C5.43728 10.2539 5.0033 9.82627 4.46856 9.82627C3.93383 9.82627 3.49985 10.2539 3.49985 10.7829C3.49985 12.65 4.12083 14.3759 5.16955 15.7707L1.27629 19.664ZM11.0316 19.1178C9.87152 18.9869 8.78151 18.6249 7.81032 18.0797L9.23211 16.6579C10.0737 17.046 11.0118 17.2629 12.0003 17.2629C15.6185 17.2629 18.5624 14.3558 18.5624 10.7829C18.5624 10.2539 18.9964 9.82627 19.5311 9.82627C20.0659 9.82627 20.4998 10.2539 20.4998 10.7829C20.4998 15.0866 17.2004 18.6404 12.969 19.1178V21.0434C12.969 21.5715 12.5351 22 12.0003 22C11.4646 22 11.0316 21.5715 11.0316 21.0434V19.1178ZM11.8249 15.2174C11.4697 15.2174 11.1245 15.1754 10.794 15.0961L16.527 9.36299V10.9203C16.527 13.2927 14.578 15.2174 12.1746 15.2174H11.8249Z" fill="#D4372B" />
                    </svg> */}
                </div>
            }
        </>
    );
}
