import {
    PanelSection,
    PanelSectionRow,
    ButtonItem,
    Navigation,
    SliderField,
    Menu,
    MenuItem,
    showContextMenu,
    ToggleField,
    DialogButton,
    Focusable
} from "decky-frontend-lib";
import { VFC, useEffect, useState } from 'react';
import i18next, { t } from 'i18next';
import { Trans, useTranslation } from 'react-i18next'
import { Backend } from "../backend";
import { L4, L5, QUICK_ACCESS_MENU } from "../ButtonIcons";

let sliderTimeoutId: NodeJS.Timeout;

const DialogButtonStyle = {
    height: "40px",
    minWidth: "40px",
    padding: "10px 12px"
};

const IconStyle = {
    display: "block", marginLeft: "Auto", marginRight: "Auto"
}

const buttonStyle = {
    height: "16px",
    width: "auto",
    marginBottom: "-4px"
};

export const TabSettings: VFC<{ backend: Backend; }> = ({ backend }) => {
    const [lowBatterySliderValue, setLowBatterySliderValue] = useState<number>(-1);
    const [enableSwitchAncValue, setEnableSwitchAncValue] = useState<boolean>(false);
    const [enableToggleMicValue, setEnableToggleMicValue] = useState<boolean>(false);
    const [enableFixDisconnectsValue, setFixDisconnectsValue] = useState<boolean>(false);
    const [languageValue, setLanguageValue] = useState<{ tag: string; nativeName: string }[]>([])
    const { i18n } = useTranslation();

    useEffect(() => {
        const getSetting = async () => {
            const lowBatterySettingValue = (await backend.deckyApi.callPluginMethod("load_setting", { key: "notif_low_battery" })).result;
            setLowBatterySliderValue(Number(lowBatterySettingValue));

            const enableSwitchAncValue = (await backend.deckyApi.callPluginMethod("load_setting", { key: "anc_l5_r5_switch" })).result; //shortcut_anc_switch when setup keys will be available
            setEnableSwitchAncValue((String(enableSwitchAncValue).toLowerCase() == "true"));

            const enableFixDisconnectsValue = (await backend.deckyApi.callPluginMethod("load_setting", { key: "fix_disconnects" })).result;
            setFixDisconnectsValue((String(enableFixDisconnectsValue).toLowerCase() == "true"));

            const enableToggleMicValue = (await backend.deckyApi.callPluginMethod("load_setting", { key: "mic_qam_l5_toggle" })).result; //shortcut_mic_toggle when setup keys will be available
            setEnableToggleMicValue((String(enableToggleMicValue).toLowerCase() == "true"));
        }

        getSetting();
        const availableLocales = Object.keys(i18next.services.resourceStore.data);
        const updatedLanguageValue = availableLocales.map(locale => ({
            tag: locale,
            nativeName: new Intl.DisplayNames([locale], { type: 'language' }).of(locale) || locale
        }));
        backend.log(updatedLanguageValue);
        setLanguageValue(updatedLanguageValue);
    }, []);
    return (
        <>
            <div style={{ marginLeft: "-8px", marginRight: "-8px" }}>
                <PanelSection>
                    <PanelSectionRow>
                        <SliderField
                            value={lowBatterySliderValue}
                            max={100}
                            min={0}
                            step={1}
                            label={t("settings_low_battery_label")}
                            notchCount={2}
                            showValue={true}
                            valueSuffix="%"
                            notchTicksVisible={false}
                            notchLabels={[
                                { label: t("settings_low_battery_label_notchlabel_off"), notchIndex: 0, value: 0 },
                                { label: "", notchIndex: 1, value: 100 },
                            ]}
                            onChange={(n) => {
                                setLowBatterySliderValue(n);
                                if (sliderTimeoutId)
                                    clearTimeout(sliderTimeoutId);

                                let starttime = Date.now();
                                sliderTimeoutId = setTimeout(async () => {
                                    backend.log(n, "Elapsed", Date.now() - starttime);
                                    await backend.deckyApi.callPluginMethod("save_setting", { key: "notif_low_battery", value: n })
                                }, 350)
                            }} />
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <ToggleField checked={enableSwitchAncValue} label={t("settings_hotkey_anc_label")} description={<Trans i18nKey="settings_hotkey_anc_description" components={{ Key1: <QUICK_ACCESS_MENU style={buttonStyle}/>, Key2: <L5 style={buttonStyle}/> }} />} onChange={async (b) => {
                            setEnableSwitchAncValue(b);
                            await backend.deckyApi.callPluginMethod("save_setting", { key: "anc_l5_r5_switch", value: b });
                            backend.bgAncSwitch.updateSetting();
                        }} />
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <ToggleField checked={enableFixDisconnectsValue} label={t("settings_fix_disconnects_label")} description={t("settings_fix_disconnects_description")}  onChange={async (b) => {
                            setFixDisconnectsValue(b);
                            await backend.deckyApi.callPluginMethod("save_setting", { key: "fix_disconnects", value: b });
                            backend.player.updateSetting();
                        }} />
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <ToggleField checked={enableToggleMicValue} label={t("settings_hotkey_mic_label")} description={<Trans i18nKey="settings_hotkey_mic_description" components={{ Key1: <QUICK_ACCESS_MENU style={buttonStyle}/>, Key2: <L4 style={buttonStyle}/> }} />}  onChange={async (b) => {
                            setEnableToggleMicValue(b);
                            await backend.deckyApi.callPluginMethod("save_setting", { key: "mic_qam_l5_toggle", value: b });                                                    
                        }} />
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <ButtonItem
                            layout="below"
                            label={t("settings_language_button_label")}
                            onClick={(e) =>
                                showContextMenu(
                                    <Menu label={t("settings_language_menu_label")} cancelText={t("settings_language_menu_canceltext")} onCancel={() => { }}>
                                        {languageValue.map((lng) => (
                                            <MenuItem disabled={i18n.resolvedLanguage === lng.tag} onSelected={() => { i18n.changeLanguage(lng.tag); backend.log(i18n.resolvedLanguage); }}>{lng.nativeName}</MenuItem>
                                        ))}
                                    </Menu>,
                                    e.currentTarget ?? window
                                )
                            }
                        >
                            {languageValue.find(lng => lng.tag == i18n.resolvedLanguage)?.nativeName || i18n.resolvedLanguage}
                        </ButtonItem>
                    </PanelSectionRow>
                    <Focusable style={{display: "flex", justifyContent: "space-between", columnGap: "8px", paddingTop: "8px", paddingBottom: "8px" }}>
                        <DialogButton style={DialogButtonStyle} onClick={() => {
                            Navigation.CloseSideMenus();
                            Navigation.Navigate("/magicpods-quick-tutorial");
                        }}>
                            <svg style={IconStyle} width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M13.99 2.52957L19.98 6.45957C21.24 7.28957 21.65 8.78957 21.25 10.0796V14.9996C21.25 15.4096 20.91 15.7496 20.5 15.7496C20.09 15.7496 19.75 15.4096 19.75 14.9996V11.9396L18.38 12.8396L13.99 15.7196C12.91 16.4296 11.13 16.4296 10.05 15.7196L5.63002 12.8396L4.03002 11.7996C2.10002 10.5396 2.10002 7.70957 4.03002 6.45957L10.05 2.52957C11.13 1.81957 12.91 1.81957 13.99 2.52957ZM18.3801 16.4802C18.3801 15.6802 17.5001 15.2002 16.8301 15.6402L14.8001 16.9702C14.0101 17.5002 13.0101 17.7602 12.0101 17.7602C11.0101 17.7602 10.0101 17.5002 9.22012 16.9702L7.16012 15.6302C6.50012 15.2002 5.62012 15.6802 5.62012 16.4702V17.7702C5.62012 19.0402 6.60012 20.4002 7.80012 20.8002L10.9901 21.8602C11.5401 22.0502 12.4501 22.0502 13.0101 21.8602L16.2001 20.8002C17.3901 20.4002 18.3801 19.0402 18.3801 17.7702V16.4802Z" fill="currentColor" /></svg>
                        </DialogButton>
                        <DialogButton style={DialogButtonStyle} onClick={() => {
                            Navigation.CloseSideMenus();
                            Navigation.Navigate("/magicpods-qr-links");
                        }}>
                            <svg style={IconStyle} width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.56301 1.2002H3.39768C2.7752 1.20089 2.17841 1.44848 1.73825 1.88864C1.29808 2.3288 1.0505 2.92559 1.0498 3.54807V8.7134C1.0505 9.33588 1.29808 9.93267 1.73825 10.3728C2.17841 10.813 2.7752 11.0606 3.39768 11.0613H8.56301C9.18549 11.0606 9.78228 10.813 10.2224 10.3728C10.6626 9.93267 10.9102 9.33588 10.9109 8.7134V3.54807C10.9102 2.92559 10.6626 2.3288 10.2224 1.88864C9.78228 1.44848 9.18549 1.20089 8.56301 1.2002ZM8.09343 8.24382H3.86726V4.01765H8.09343V8.24382ZM8.56301 12.9385H3.39768C2.7752 12.9392 2.17841 13.1868 1.73825 13.6269C1.29808 14.0671 1.0505 14.6639 1.0498 15.2864V20.4517C1.0505 21.0742 1.29808 21.671 1.73825 22.1111C2.17841 22.5513 2.7752 22.7989 3.39768 22.7996H8.56301C9.18549 22.7989 9.78228 22.5513 10.2224 22.1111C10.6626 21.671 10.9102 21.0742 10.9109 20.4517V15.2864C10.9102 14.6639 10.6626 14.0671 10.2224 13.6269C9.78228 13.1868 9.18549 12.9392 8.56301 12.9385ZM8.09343 19.9821H3.86726V15.7559H8.09343V19.9821ZM15.1374 1.2002H20.3028C20.9252 1.20089 21.522 1.44848 21.9622 1.88864C22.4024 2.3288 22.6499 2.92559 22.6506 3.54807V8.7134C22.6499 9.33588 22.4024 9.93267 21.9622 10.3728C21.522 10.813 20.9252 11.0606 20.3028 11.0613H15.1374C14.5149 11.0606 13.9182 10.813 13.478 10.3728C13.0378 9.93267 12.7902 9.33588 12.7896 8.7134V3.54807C12.7902 2.92559 13.0378 2.3288 13.478 1.88864C13.9182 1.44848 14.5149 1.20089 15.1374 1.2002ZM15.607 8.24382H19.8332V4.01765H15.607V8.24382ZM14.1983 18.5734C14.5719 18.5734 14.9302 18.4249 15.1944 18.1608C15.4586 17.8966 15.607 17.5383 15.607 17.1647V14.3472C15.607 13.9736 15.4586 13.6153 15.1944 13.3511C14.9302 13.0869 14.5719 12.9385 14.1983 12.9385C13.8247 12.9385 13.4663 13.0869 13.2022 13.3511C12.938 13.6153 12.7896 13.9736 12.7896 14.3472V17.1647C12.7896 17.5383 12.938 17.8966 13.2022 18.1608C13.4664 18.4249 13.8247 18.5734 14.1983 18.5734ZM19.8332 14.8168H21.2419C21.6155 14.8168 21.9738 14.9652 22.238 15.2294C22.5022 15.4936 22.6506 15.8519 22.6506 16.2255C22.6506 16.5991 22.5022 16.9574 22.238 17.2216C21.9738 17.4858 21.6155 17.6342 21.2419 17.6342H19.8332V21.3908C19.8332 21.7644 19.6847 22.1227 19.4206 22.3869C19.1564 22.6511 18.7981 22.7995 18.4245 22.7996H14.1983C13.8247 22.7996 13.4663 22.6511 13.2022 22.3869C12.938 22.1228 12.7896 21.7644 12.7896 21.3908C12.7896 21.0172 12.938 20.6589 13.2022 20.3947C13.4663 20.1305 13.8247 19.9821 14.1983 19.9821H17.0157V14.3472C17.0157 13.9736 17.1641 13.6153 17.4283 13.3511C17.6925 13.0869 18.0508 12.9385 18.4245 12.9385C18.7981 12.9385 19.1564 13.0869 19.4206 13.3511C19.6848 13.6153 19.8332 13.9736 19.8332 14.3472V14.8168Z" fill="currentColor" /></svg>
                        </DialogButton>
                        <DialogButton style={DialogButtonStyle} onClick={() => {
                            Navigation.CloseSideMenus();
                            Navigation.Navigate("/magicpods-log");
                        }}>
                            <svg style={IconStyle} width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.81 2H16.191C19.28 2 21 3.78 21 6.83V17.16C21 20.26 19.28 22 16.191 22H7.81C4.77 22 3 20.26 3 17.16V6.83C3 3.78 4.77 2 7.81 2ZM8.08 6.66V6.65H11.069C11.5 6.65 11.85 7 11.85 7.429C11.85 7.87 11.5 8.22 11.069 8.22H8.08C7.649 8.22 7.3 7.87 7.3 7.44C7.3 7.01 7.649 6.66 8.08 6.66ZM8.08 12.74H15.92C16.35 12.74 16.7 12.39 16.7 11.96C16.7 11.53 16.35 11.179 15.92 11.179H8.08C7.649 11.179 7.3 11.53 7.3 11.96C7.3 12.39 7.649 12.74 8.08 12.74ZM8.08 17.31H15.92C16.319 17.27 16.62 16.929 16.62 16.53C16.62 16.12 16.319 15.78 15.92 15.74H8.08C7.78 15.71 7.49 15.85 7.33 16.11C7.17 16.36 7.17 16.69 7.33 16.95C7.49 17.2 7.78 17.35 8.08 17.31Z" fill="currentColor" /></svg>
                        </DialogButton>
                        <DialogButton style={DialogButtonStyle} onClick={() => {
                            Navigation.CloseSideMenus();
                            Navigation.NavigateToExternalWeb("https://boosty.to/steam3d/donate/");
                        }}>
                            <svg style={IconStyle} width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.44 3.09961C14.63 3.09961 13.01 3.97961 12 5.32961C10.99 3.97961 9.37 3.09961 7.56 3.09961C4.49 3.09961 2 5.59961 2 8.68961C2 9.87961 2.19 10.9796 2.52 11.9996C4.1 16.9996 8.97 19.9896 11.38 20.8096C11.72 20.9296 12.28 20.9296 12.62 20.8096C15.03 19.9896 19.9 16.9996 21.48 11.9996C21.81 10.9796 22 9.87961 22 8.68961C22 5.59961 19.51 3.09961 16.44 3.09961Z" fill="#FF6868" /></svg>
                        </DialogButton>
                    </Focusable>
                </PanelSection>
            </div>
        </>
    );
}