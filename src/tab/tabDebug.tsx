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

import { FC } from 'react';
import { t } from 'i18next';

import { LogoIcon } from "../icons";
import { Backend } from "../backend";

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
                                //backend.update.disable();
                            }}>
                            Stop check update
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
                                backend.log("restart_backend started");
                                await call<[], void>("restart_backend");
                                backend.connect();
                                backend.log("restart_backend ended")
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