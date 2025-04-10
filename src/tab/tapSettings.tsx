import {
    PanelSection,
    PanelSectionRow,
    ButtonItem,
    Navigation,
    SliderField,
    Menu,
    MenuItem,
    showContextMenu,
    ToggleField
} from "@decky/ui";
import { FC, useEffect, useState } from 'react';
import i18next, { t } from 'i18next';
import { Trans, useTranslation } from 'react-i18next'
import { Backend } from "../backend";
import { L4, L5, QUICK_ACCESS_MENU } from "../ButtonIcons";
import PanelSocialButton from "../components/socialButton";
import { call } from "@decky/api";

let sliderTimeoutId: NodeJS.Timeout;

const buttonStyle = {
    height: "16px",
    width: "auto",
    marginBottom: "-4px"
};

export const TabSettings: FC<{ backend: Backend; }> = ({ backend }) => {
    const [sliderLowBattery, setSliderLowBattery] = useState<number>(-1);
    const [sliderLogLevel, setSliderLogLevel] = useState<number>(-1);
    const [toggleSwitchAncHotkey, setToggleSwitchAncHotkey] = useState<boolean>(false);
    const [toggleMicHotkey, setToggleMicHotkey] = useState<boolean>(false);
    const [toggleFixDisconnects, setToggleFixDisconnects] = useState<boolean>(false);
    const [toggleAncOff, setToggleAncOff] = useState<boolean>(false);
    const [toggleAncTransparency, setToggleAncTransparency] = useState<boolean>(false);
    const [toggleAncAdaptive, setToggleAncAdaptive] = useState<boolean>(false);
    const [toggleAncWind, setToggleAncWind] = useState<boolean>(false);
    const [toggleAncOn, setToggleAncOn] = useState<boolean>(false);

    const [availableLanguages, setAvailableLanguages] = useState<{ tag: string; nativeName: string }[]>([])
    const { i18n } = useTranslation();

    useEffect(() => {
        const getSetting = async () => {
            setSliderLowBattery(await backend.loadNumberSetting("notif_low_battery") ?? -1);
            setSliderLogLevel(await backend.loadNumberSetting("log_level") ?? -1);
            setToggleSwitchAncHotkey(await backend.loadBooleanSetting("anc_l5_r5_switch"));
            setToggleFixDisconnects(await backend.loadBooleanSetting("fix_disconnects"));
            setToggleMicHotkey(await backend.loadBooleanSetting("mic_qam_l5_toggle"));
            setToggleAncOff(await backend.loadBooleanSetting("allow_anc_mode_off"));
            setToggleAncTransparency(await backend.loadBooleanSetting("allow_anc_mode_transparency"));
            setToggleAncAdaptive(await backend.loadBooleanSetting("allow_anc_mode_adaptive"));
            setToggleAncWind(await backend.loadBooleanSetting("allow_anc_mode_wind"));
            setToggleAncOn(await backend.loadBooleanSetting("allow_anc_mode_anc"));
        };

        getSetting();
        const availableLocales = Object.keys(i18next.services.resourceStore.data);
        const updatedLanguageValue = availableLocales.map(locale => ({
            tag: locale,
            nativeName: new Intl.DisplayNames([locale], { type: 'language' }).of(locale) || locale
        }));
        backend.log("Settings:", updatedLanguageValue);
        setAvailableLanguages(updatedLanguageValue);
    }, []);
    return (
        <>
            <div style={{ marginLeft: "-8px", marginRight: "-8px" }}>
                <PanelSection title={t("settings_header")}>
                    <PanelSectionRow>
                        <SliderField
                            value={sliderLowBattery}
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
                                setSliderLowBattery(n);
                                if (sliderTimeoutId)
                                    clearTimeout(sliderTimeoutId);

                                let starttime = Date.now();
                                sliderTimeoutId = setTimeout(async () => {
                                    backend.log("Settings: Elapsed", Date.now() - starttime, "Set low battery to", n);
                                    await backend.saveSetting("notif_low_battery", n);
                                }, 350)
                            }} />
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <ToggleField checked={toggleSwitchAncHotkey} label={t("settings_hotkey_anc_label")} description={<Trans i18nKey="settings_hotkey_anc_description" components={{ Key1: <QUICK_ACCESS_MENU style={buttonStyle} />, Key2: <L5 style={buttonStyle} /> }} />} onChange={async (b) => {
                            setToggleSwitchAncHotkey(b);
                            await backend.saveSetting("anc_l5_r5_switch", b);
                            backend.bgAncSwitch.updateSetting();
                        }} />
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <ToggleField checked={toggleMicHotkey} label={t("settings_hotkey_mic_label")} description={<Trans i18nKey="settings_hotkey_mic_description" components={{ Key1: <QUICK_ACCESS_MENU style={buttonStyle} />, Key2: <L4 style={buttonStyle} /> }} />} onChange={async (b) => {
                            setToggleMicHotkey(b);
                            await backend.saveSetting("mic_qam_l5_toggle", b);
                        }} />
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <ToggleField checked={toggleFixDisconnects} label={t("settings_fix_disconnects_label")} description={t("settings_fix_disconnects_description")} onChange={async (b) => {
                            setToggleFixDisconnects(b);
                            await backend.saveSetting("fix_disconnects", b);
                            backend.player.updateSetting();
                        }} />
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <ButtonItem
                            layout="below"
                            label={t("settings_language_button_label")}
                            onClick={(e) =>
                                showContextMenu(
                                    <Menu label={t("settings_language_menu_label")} cancelText={t("settings_language_menu_canceltext")} onCancel={() => { }}>
                                        {availableLanguages.map((lng) => (
                                            <MenuItem key={lng.tag} disabled={i18n.resolvedLanguage === lng.tag} onSelected={() => { i18n.changeLanguage(lng.tag); backend.log(i18n.resolvedLanguage); }}>{lng.nativeName}</MenuItem>
                                        ))}
                                    </Menu>,
                                    e.currentTarget ?? window
                                )
                            }
                        >
                            {availableLanguages.find(lng => lng.tag == i18n.resolvedLanguage)?.nativeName || i18n.resolvedLanguage}
                        </ButtonItem>
                    </PanelSectionRow>
                </PanelSection>

                <PanelSection title={t("settings_anc_modes_header")}>
                    <PanelSectionRow>
                        <ToggleField checked={toggleAncOff} label={t("settings_anc_modes_off_label")} onChange={async (b) => {
                            setToggleAncOff(b);
                            await backend.saveSetting("allow_anc_mode_off", b);
                        }} />
                    </PanelSectionRow>
                    <PanelSectionRow>
                        <ToggleField checked={toggleAncTransparency} label={t("settings_anc_modes_transparency_label")} onChange={async (b) => {
                            setToggleAncTransparency(b);
                            await backend.saveSetting("allow_anc_mode_transparency", b);
                        }} />
                    </PanelSectionRow>
                    <PanelSectionRow>
                        <ToggleField checked={toggleAncAdaptive} label={t("settings_anc_modes_adaptive_label")} onChange={async (b) => {
                            setToggleAncAdaptive(b);
                            await backend.saveSetting("allow_anc_mode_adaptive", b);
                        }} />
                    </PanelSectionRow>
                    <PanelSectionRow>
                        <ToggleField checked={toggleAncWind} label={t("settings_anc_modes_wind_label")} onChange={async (b) => {
                            setToggleAncWind(b);
                            await backend.saveSetting("allow_anc_mode_wind", b);
                        }} />
                    </PanelSectionRow>
                    <PanelSectionRow>
                        <ToggleField checked={toggleAncOn} label={t("settings_anc_modes_anc_label")} onChange={async (b) => {
                            setToggleAncOn(b);
                            await backend.saveSetting("allow_anc_mode_anc", b);
                        }} />
                    </PanelSectionRow>
                </PanelSection>

                    <PanelSection title={t("settings_misc_header")}>

                    <PanelSocialButton url="https://magicpods.app/donate/">
                        {t("settings_social_button_donate")}
                    </PanelSocialButton>

                    <PanelSocialButton url="https://magicpods.app/steamdeck/">
                        {t("settings_social_button_start")}
                    </PanelSocialButton>

                    <PanelSocialButton url="https://weblate.magicpods.app/engage/magicpods-steamdeck/">
                        {t("settings_social_button_translate")}
                    </PanelSocialButton>

                    <PanelSocialButton url="https://discord.com/invite/ARSm6CG7jf">
                        Discord
                    </PanelSocialButton>

                    </PanelSection>

                    <PanelSection title={t("settings_debug_header")}>
                    <PanelSectionRow>
                        <SliderField
                            value={50-sliderLogLevel}
                            max={40}
                            min={0}
                            step={10}
                            label={t("settings_debug_level_label")}
                            notchCount={5}
                            notchTicksVisible={true}
                            notchLabels={[
                                { label: "Off", notchIndex: 0, value: 0 },
                                { label: "Err", notchIndex: 1, value: 10 },
                                { label: "Wrn", notchIndex: 2, value: 20 },
                                { label: "Inf", notchIndex: 3, value: 30 },
                                { label: "Dbg", notchIndex: 4, value: 40 },
                            ]}
                            onChange={(n) => {
                                const nn = 50-n;
                                setSliderLogLevel(nn);
                                if (sliderTimeoutId)
                                    clearTimeout(sliderTimeoutId);

                                let starttime = Date.now();
                                sliderTimeoutId = setTimeout(async () => {
                                    backend.log("Settings: Elapsed", Date.now() - starttime, "Set log level to", nn);                                    
                                    await backend.saveSetting("log_level", nn);
                                    await call<[], void>("update_log_level");
                                }, 350)
                            }} />
                    </PanelSectionRow>

                    <PanelSectionRow>
                    <ButtonItem
                        layout="below"
                        bottomSeparator="none"
                        onClick={() =>
                        {
                            Navigation.CloseSideMenus();
                            Navigation.Navigate("/magicpods-log");
                        }}>
                            {t("settings_debug_log_button")}
                        </ButtonItem>
                    </PanelSectionRow>
                </PanelSection>
            </div>
        </>
    );
}