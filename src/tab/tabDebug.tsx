import {
    PanelSection,
    PanelSectionRow,
    ButtonItem,
    Navigation,
} from "@decky/ui";
import {
    call,
    toaster
} from "@decky/api";

import * as classes from "@decky/ui/dist/utils/static-classes";
import { FC } from 'react';
import { t } from 'i18next';

import { LogoIcon } from "../icons";
import { Backend } from "../backend";

export const data = {
    headphones: [
        { name: "Z AirPods (steam3d)", address: "12:45:ds:23:fd:11", connected: true },
        { name: "G AirPods Max (steam3d)", address: "12:45:ds:23:fd:12", connected: false },
        { name: "AirPods Pro (steam3d)", address: "12:45:ds:23:fd:13", connected: false },
        { name: "PowerBeatsPro", address: "12:45:ds:23:fd:14", connected: false },
        { name: "Sony SBH20", address: "12:45:ds:23:fd:15", connected: true },

    ],

    defaultbluetooth: {
        enabled: true
    },

    info: {
        name: "AirPods (steam3d)",
        address: "12:45:ds:23:fd:12",
        connected: true,
        capabilities: {
            battery: {
                single: {
                    battery: 0,
                    charging: true,
                    status: 0,
                },
                left: {
                    battery: 0,
                    charging: false,
                    status: 2,
                },
                right: {
                    battery: 50,
                    charging: false,
                    status: 2,
                },
                case: {
                    battery: 100,
                    charging: true,
                    status: 3,
                },
                readonly: true,
            },
            anc: {
                options: 0b00011111,
                selected: 0b00000001,
                readonly: false,
            }
        }
    }
}

export const TabDebug: FC<{ backend: Backend; }> = ({ backend }) => {
    return (
        <>
            <div style={{ marginLeft: "-8px", marginRight: "-8px" }}>
                <PanelSection>
                    <PanelSectionRow>
                        <ButtonItem
                            layout="below"
                            onClick={() => {
                                Navigation.CloseSideMenus();
                                Navigation.Navigate("/magicpods-log");
                            }}>
                            Debug log
                        </ButtonItem>
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <ButtonItem
                            layout="below"
                            onClick={async () => {
                                for (const [groupName, groupObj] of Object.entries(classes)) {
                                    if (typeof groupObj === "object" && groupObj !== null) {
                                        backend.logDebug(`\n=== ${groupName} ===`);
                                        for (const [name, value] of Object.entries(groupObj)) {
                                            backend.logDebug(`${name}: ${value}`);
                                        }
                                    }
                                }
                            }}>
                            print classes
                        </ButtonItem>
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <ButtonItem
                            layout="below"
                            onClick={async () => {
                                await call<[], void>("play");
                            }}>
                            Play
                        </ButtonItem>
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <ButtonItem
                            layout="below"
                            onClick={async () => {
                                await call<[], void>("stop");
                            }}>
                            Stop
                        </ButtonItem>
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <ButtonItem
                            layout="below"
                            onClick={async () => {
                                backend.logCritical("logCritical");
                                backend.logError("logError");
                                backend.logWarning("logWarning");
                                backend.logInfo("logInfo");
                                backend.logDebug("logDebug");
                                backend.logTrace("logTrace");
                            }}>
                            Test logs
                        </ButtonItem>
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <ButtonItem
                            layout="below"
                            onClick={() => {
                                backend.connect();
                            }}>
                            Connect socket
                        </ButtonItem>
                    </PanelSectionRow>
                    <PanelSectionRow>
                        <ButtonItem
                            layout="below"
                            onClick={() => {
                                backend.disconnect();
                            }}>
                            Disconnect socket
                        </ButtonItem>
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <ButtonItem
                            layout="below"
                            onClick={async () => {
                                await call<[], void>("debug_start_backed");
                            }}>
                            Start backend
                        </ButtonItem>
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <ButtonItem
                            layout="below"
                            onClick={async () => {
                                await call<[], void>("debug_stop_backed");
                            }}>
                            Stop backend
                        </ButtonItem>
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <ButtonItem
                            layout="below"
                            onClick={async () => {
                                backend.logDebug("restart_backend started");
                                await call<[], void>("restart_backend");
                                backend.connect();
                                backend.logDebug("restart_backend ended")
                            }}>
                            Restart backend and connect socket
                        </ButtonItem>
                    </PanelSectionRow>


                    <PanelSectionRow>
                        <ButtonItem layout="below" onClick={async () => {
                            toaster.toast({
                                icon: <LogoIcon />,
                                title: "MagicPods",
                                duration: 15_000,
                                body: t("notif_error_websocket_connection_issue")
                            })
                        }} >
                            Notif socket error
                        </ButtonItem>

                    </PanelSectionRow>
                    <PanelSectionRow>
                        <ButtonItem layout="below" onClick={async () => {
                            toaster.toast({
                                icon: <LogoIcon />,
                                title: "MagicPods",
                                duration: 15_000,
                                body: t("notif_low_battery", { battery: 75 })
                            })
                        }} >
                            Notif low battery
                        </ButtonItem>
                    </PanelSectionRow>
                </PanelSection>
            </div>
        </>
    );
}