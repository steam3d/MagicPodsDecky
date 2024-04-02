import {
    PanelSection,
    PanelSectionRow,
    ButtonItem,
    Navigation,
} from "decky-frontend-lib";
import { VFC } from 'react';
import { t } from 'i18next';

import { LogoIcon } from "../icons";
import { Backend } from "../backend";

export const TabDebug: VFC<{ backend: Backend; }> = ({ backend }) => {
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
                                backend.update.disable();
                            }}>
                            Stop check update
                        </ButtonItem>
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <ButtonItem
                            layout="below"
                            onClick={async () => {
                                await backend.deckyApi.callPluginMethod("play", {})
                            }}>
                            Play
                        </ButtonItem>
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <ButtonItem
                            layout="below"
                            onClick={async () => {
                                await backend.deckyApi.callPluginMethod("stop", {})
                            }}>
                            Stop
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
                                await backend.deckyApi.callPluginMethod("debug_start_backed", {})
                            }}>
                            Start backend
                        </ButtonItem>
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <ButtonItem
                            layout="below"
                            onClick={async () => {
                                await backend.deckyApi.callPluginMethod("debug_stop_backed", {})
                            }}>
                            Stop backend
                        </ButtonItem>
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <ButtonItem
                            layout="below"
                            onClick={async () => {
                                backend.log("restart_backend started");
                                let result = (await backend.deckyApi.callPluginMethod("restart_backend", {}));
                                if (result.success) {
                                  backend.connect();
                                  backend.log("backend restarted", result.success);
                                }
                                backend.log("restart_backend ended")
                              }}>
                            Restart backend and connect socket
                        </ButtonItem>
                    </PanelSectionRow>


                    <PanelSectionRow>
                        <ButtonItem layout="below" onClick={async () => {
                            backend.deckyApi.toaster.toast({
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
                            backend.deckyApi.toaster.toast({
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