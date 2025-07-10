import {
  PanelSection,
  PanelSectionRow,
  gamepadDialogClasses,
  joinClassNames,
  SliderField,
  staticClasses,
  ToggleField,
  quickAccessMenuClasses,
  Focusable,
  showModal,
  ModalRoot
} from "@decky/ui";
import { t } from 'i18next';
import { useEffect, useState, FC, useRef } from 'react';
import { Battery } from "../components/battery";
import { Backend } from "../backend";
import { ANC_MODE_ADAPTIVE, ANC_MODE_ANC, ANC_MODE_OFF, ANC_MODE_TRANSPARENCY, ANC_MODE_WIND } from "../ButtonIcons";

const FieldWithSeparator = joinClassNames(
  gamepadDialogClasses.Field,
  gamepadDialogClasses.WithBottomSeparatorStandard
)

const FieldWithSeparator1 = joinClassNames(
  gamepadDialogClasses.HighlightOnFocus,
  gamepadDialogClasses.Field,
  quickAccessMenuClasses.PanelSectionRow,
)

const iconModesStyle = {
  display: "block"
}

export interface BatteryDataProps {
  battery: number,
  charging: boolean,
  status: number,
}

export interface AncProps {
  options: number,
  selected: number,
  readonly: boolean,
}

interface BatteryProps {
  single: BatteryDataProps,
  left: BatteryDataProps,
  right: BatteryDataProps,
  case: BatteryDataProps,
  readonly: boolean,
}

interface BooleanCapabilityProps {
  selected: boolean,
  readonly: boolean
}

interface NumberCapabilityProps {
  selected: number,
  readonly: boolean
}

interface CapabilitiesProps {
  anc?: AncProps;
  battery?: BatteryProps;
  conversationAwareness?: BooleanCapabilityProps;
  conversationAwarenessSpeaking?: BooleanCapabilityProps;
  personalizedVolume?: BooleanCapabilityProps;
  ancOneAirPod?: BooleanCapabilityProps;
  volumeSwipe?: BooleanCapabilityProps;
  endCall?: NumberCapabilityProps;
  pressAndHoldDuration?: NumberCapabilityProps;
  pressSpeed?: NumberCapabilityProps;
  toneVolume?: NumberCapabilityProps;
  volumeSwipeLength?: NumberCapabilityProps;
  adaptiveAudioNoise?: NumberCapabilityProps;
}

export interface headphoneInfoProps {
  name: string;
  address: string;
  connected: boolean;

  capabilities: CapabilitiesProps;
}

export const AncModes = {
  OFF: 1,
  TRANSPARENCY: 2,
  ADAPTIVE: 4,
  WIND: 8,
  ANC: 16,
};

const getAncSliderConfig = async (backend: Backend, options: number, selected: number) => {
  backend.logDebug("Info: Options:", options, "Selected:", selected);

  let _count = 0;
  let _selectedIndex = 0;
  let _labels = [];
  let _convertBack: { [key: number]: number } = {};

  let isOff = await backend.loadBooleanSetting("allow_anc_mode_off");
  let isTransparency = await backend.loadBooleanSetting("allow_anc_mode_transparency");
  let isAdaptive = await backend.loadBooleanSetting("allow_anc_mode_adaptive");
  let isWind = await backend.loadBooleanSetting("allow_anc_mode_wind");
  let isAnc = await backend.loadBooleanSetting("allow_anc_mode_anc");

  const trueCount = [isOff, isTransparency, isAdaptive, isWind, isAnc].filter(Boolean).length;
  if (trueCount < 2)
    return null;

  //The order is important OFF->TRA->ADAP->WIND->ANC
  if (isOff && (options & AncModes.OFF) != 0) {
    _count += 1;
    _labels.push({ label: <ANC_MODE_OFF style={iconModesStyle} />, notchIndex: _count - 1, value: _count },);
    _convertBack[_count] = AncModes.OFF;
    if ((selected & AncModes.OFF) != 0) _selectedIndex = _count;
  }

  if (isTransparency && (options & AncModes.TRANSPARENCY) != 0) {
    _count += 1;
    _labels.push({ label: <ANC_MODE_TRANSPARENCY style={iconModesStyle} />, notchIndex: _count - 1, value: _count },);
    _convertBack[_count] = AncModes.TRANSPARENCY;
    if ((selected & AncModes.TRANSPARENCY) != 0) _selectedIndex = _count;
  }

  if (isAdaptive && (options & AncModes.ADAPTIVE) != 0) {
    _count += 1;
    _labels.push({ label: <ANC_MODE_ADAPTIVE style={iconModesStyle} />, notchIndex: _count - 1, value: _count },);
    _convertBack[_count] = AncModes.ADAPTIVE;
    if ((selected & AncModes.ADAPTIVE) != 0) _selectedIndex = _count;
  }

  if (isWind && (options & AncModes.WIND) != 0) {
    _count += 1;
    _labels.push({ label: <ANC_MODE_WIND style={iconModesStyle} />, notchIndex: _count - 1, value: _count },);
    _convertBack[_count] = AncModes.WIND;
    if ((selected & AncModes.WIND) != 0) _selectedIndex = _count;
  }

  if (isAnc && (options & AncModes.ANC) != 0) {
    _count += 1;
    _labels.push({ label: <ANC_MODE_ANC style={iconModesStyle} />, notchIndex: _count - 1, value: _count },);
    _convertBack[_count] = AncModes.ANC;
    if ((selected & AncModes.ANC) != 0) _selectedIndex = _count;
  }

  backend.logDebug("Info: SelectedIndex:", _selectedIndex, "Count:", _count, "ConvertBackDict:", _convertBack, "Label:", _labels);

  return {
    value: _selectedIndex,
    max: _count,
    notchCount: _count,
    labels: _labels,
    convert: _convertBack,
  };

};

const showQrModal = () => {
    showModal(
        <ModalRoot>
            <span style={{ textAlign: 'center', wordBreak: 'break-word' }}>{t("capabilities_modal")}</span>
        </ModalRoot>,
        window
    );
};


export const TabInfo: FC<{
  info?: headphoneInfoProps,
  setInfoValue: (value: headphoneInfoProps) => void,
  backend: Backend,
}> = ({ info, setInfoValue, backend }) => {

  const [config, setConfig] = useState<Awaited<ReturnType<typeof getAncSliderConfig>> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [volume, setVolume] = useState<number>(0);


  const timeoutIds = useRef<Record<string, NodeJS.Timeout>>({});
  type CapabilityKey = keyof CapabilitiesProps;

  const commonUpdateInfo = (key: CapabilityKey, value: any) => {
    const capability = info?.capabilities?.[key];
    if (capability && 'selected' in capability) {
      const clonedInfo = { ...info };
      clonedInfo.capabilities = {
        ...clonedInfo.capabilities,
        [key]: {
          ...capability,
          selected: value,
        },
      };
      setInfoValue(clonedInfo);
    }
  }

  const handleBooleanCapabilityChange = (key: CapabilityKey, value: boolean) => {
      commonUpdateInfo(key, value);    
      const address = info?.address;
      if (address){
        backend.logInfo(`Send set ${key} to`, value);   
        backend.setCapability(key, address, value);     
      }
  }

  const handleNumberCapabilityChange = (key: CapabilityKey, value: number) => {
    commonUpdateInfo(key, value);
    if (timeoutIds.current[key])
      clearTimeout(timeoutIds.current[key]);

    const starttime = Date.now();
    const address = info?.address;

    timeoutIds.current[key] = setTimeout(() => {
      if (address) {
        backend.logInfo(
          `Info: Elapsed: ${Date.now() - starttime}ms. Send set ${key} to`,
          value
        );
        backend.setCapability(key, address, value);
      }
      delete timeoutIds.current[key];
    }, 350);
  };

  useEffect(() => {
    const fetchConfig = async () => {
      //setLoaded(false);
      if (info?.capabilities?.anc != null) {
        const result = await getAncSliderConfig(backend, info.capabilities.anc.options, info.capabilities.anc.selected);
        setConfig(result);
        setLoaded(true);
      } else {
        setConfig(null);
        setLoaded(true);
      }
    };

    fetchConfig();
  },[info?.capabilities?.anc?.options, info?.capabilities?.anc?.selected]); 
  //[info, backend]);

  useEffect(() => {
    const fetchSettings = async () => {
      setVolume(await backend.loadNumberSetting("conversation_awareness_volume") ?? 0);
    }
    fetchSettings();
  }, [info?.capabilities?.conversationAwareness?.selected]);
  return (
    <>
      <div style={{ marginLeft: "-8px", marginRight: "-8px" }}>
        {info == null && <div className={staticClasses.Text} style={{ paddingLeft: "16px", paddingRight: "16px" }}>{t("headphones_disconnected")}</div>}

        {info?.name != null &&
          <PanelSection title={info.name}>
            {info?.capabilities?.battery != null &&
              <PanelSectionRow>
                <div className={FieldWithSeparator}>
                  <div style={{ display: "flex", padding: "0px 0px 0px 0px" }}>
                    <Battery title={t("battery_single")} battery={info.capabilities.battery.single.battery} isCharging={info.capabilities.battery.single.charging} status={info.capabilities.battery.single.status} />
                    <Battery title={t("battery_left")} battery={info.capabilities.battery.left.battery} isCharging={info.capabilities.battery.left.charging} status={info.capabilities.battery.left.status} />
                    <Battery title={t("battery_right")} battery={info.capabilities.battery.right.battery} isCharging={info.capabilities.battery.right.charging} status={info.capabilities.battery.right.status} />
                    <Battery title={t("battery_case")} battery={info.capabilities.battery.case.battery} isCharging={info.capabilities.battery.case.charging} status={info.capabilities.battery.case.status} />
                  </div>
                </div>
              </PanelSectionRow>
            }

            {info?.capabilities?.anc != null &&  config != null &&
              <PanelSectionRow>
                <SliderField
                  value={config.value}
                  max={config.max}
                  min={1}
                  step={1}
                  label={t("capabilities_noise_control_label")}
                  notchCount={config.notchCount}
                  notchTicksVisible={false}
                  // @ts-ignore
                  notchLabels={config.labels}
                  onChange={(n) => {
                    const v = config.convert[n] ?? 0;
                    backend.logDebug("Info: ANC slider changed to UI:", n, "Native:", v);
                    handleNumberCapabilityChange("anc", v);}} />
              </PanelSectionRow>
            }
{/* Fix jumping selection issue */}
            {loaded == true && (
              <>
            <Focusable
              noFocusRing={true}
              className={FieldWithSeparator1}
              style={{ marginLeft: "-16px", marginRight: "-16px", marginTop: "24px" }}
              onOKButton={() => showQrModal()}>
              <div className={staticClasses.PanelSectionTitle}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                onClick={() => showQrModal()}>
                {t("capabilities_header")}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M18 3C15.0333 3 12.1332 3.87973 9.66645 5.52796C7.19971 7.17618 5.27712 9.51886 4.14181 12.2597C3.00649 15.0006 2.70944 18.0166 3.28822 20.9264C3.867 23.8361 5.29561 26.5088 7.3934 28.6066C9.49119 30.7044 12.1639 32.133 15.0736 32.7118C17.9834 33.2906 20.9994 32.9935 23.7402 31.8582C26.4811 30.7229 28.8238 28.8003 30.472 26.3336C32.1203 23.8668 33 20.9667 33 18C33 16.0302 32.612 14.0796 31.8582 12.2597C31.1044 10.4399 29.9995 8.78628 28.6066 7.3934C27.2137 6.00052 25.5601 4.89563 23.7402 4.14181C21.9204 3.38799 19.9698 3 18 3ZM20.5 26H15.5V16H20.5V26ZM18 14C17.4067 14 16.8266 13.8241 16.3333 13.4944C15.8399 13.1648 15.4554 12.6962 15.2284 12.1481C15.0013 11.5999 14.9419 10.9967 15.0576 10.4147C15.1734 9.83279 15.4591 9.29824 15.8787 8.87868C16.2982 8.45912 16.8328 8.1734 17.4147 8.05764C17.9967 7.94189 18.5999 8.0013 19.148 8.22836C19.6962 8.45542 20.1648 8.83994 20.4944 9.33329C20.8241 9.82664 21 10.4067 21 11C21 11.7956 20.6839 12.5587 20.1213 13.1213C19.5587 13.6839 18.7956 14 18 14Z" fill="currentColor"></path></svg>
              </div>
            </Focusable>

            {info?.capabilities?.conversationAwareness != null && (
              <>
              <PanelSectionRow>
                <ToggleField checked={info?.capabilities?.conversationAwareness.selected} label={t("capabilities_aap_conversation_awareness_label")}
                  onChange={(b) => {handleBooleanCapabilityChange("conversationAwareness", b);}} />
              </PanelSectionRow>
              <PanelSectionRow>
                  <SliderField
                    value={volume}
                    max={100}
                    min={0}
                    step={1}
                    label={t("capabilities_aap_conversation_awareness_volume_label")}
                    notchCount={2}
                    notchTicksVisible={false}
                    showValue={true}
                    valueSuffix="%"
                    disabled={!info?.capabilities?.conversationAwareness.selected}
                    notchLabels={[
                      { label: t("capabilities_aap_conversation_awareness_volume_label_notchlabel_off"), notchIndex: 0, value: 0 },
                      { label: "", notchIndex: 1, value: 100 }
                    ]}
                    onChange={(n) => {
                      setVolume(n);

                      const key = "conversationAwarenessSpeaking";
                      if (timeoutIds.current[key])
                        clearTimeout(timeoutIds.current[key]);

                      let starttime = Date.now();
                      timeoutIds.current[key] = setTimeout(async () => {
                          backend.logInfo("Settings: Elapsed", Date.now() - starttime, "Set volume to", n);
                          await backend.saveSetting("conversation_awareness_volume", n);
                          delete timeoutIds.current[key];
                      }, 350)
                  }} />
                </PanelSectionRow>
              </>
            )}

            {info?.capabilities?.personalizedVolume != null &&
              <PanelSectionRow>
                <ToggleField checked={info?.capabilities?.personalizedVolume.selected} label={t("capabilities_aap_personalized_volume_label")}
                onChange={(b) => {handleBooleanCapabilityChange("personalizedVolume", b);}} />
              </PanelSectionRow>
            }

            {info?.capabilities?.adaptiveAudioNoise != null &&
              <PanelSectionRow>
                <SliderField
                  value={info?.capabilities?.adaptiveAudioNoise.selected}
                  max={100}
                  min={0}
                  step={50}
                  label={t("capabilities_aap_adaptive_audio_noise_label")}
                  notchCount={3}
                  notchTicksVisible={false}
                  notchLabels={[
                    { label: t("capabilities_aap_adaptive_audio_noise_notchlabel_more"), notchIndex: 0, value: 0 },
                    { label: t("capabilities_aap_adaptive_audio_noise_notchlabel_default"), notchIndex: 1, value: 50 },
                    { label: t("capabilities_aap_adaptive_audio_noise_notchlabel_less"), notchIndex: 2, value: 100 }
                  ]}
                  onChange={(n) => {handleNumberCapabilityChange("adaptiveAudioNoise", n);}} />
              </PanelSectionRow>
            }

            {info?.capabilities?.ancOneAirPod != null &&
              <PanelSectionRow>
                <ToggleField checked={info?.capabilities?.ancOneAirPod.selected} label={t("capabilities_aap_anc_one_airpod_label")}
                onChange={(b) => {handleBooleanCapabilityChange("ancOneAirPod", b);}} />
              </PanelSectionRow>
            }

            {info?.capabilities?.pressAndHoldDuration != null &&
              <PanelSectionRow>
                <SliderField
                  value={info?.capabilities?.pressAndHoldDuration.selected}
                  max={2}
                  min={0}
                  step={1}
                  label={t("capabilities_aap_press_and_hold_duration_label")}
                  notchCount={3}
                  notchTicksVisible={false}
                  notchLabels={[
                    { label: t("capabilities_aap_press_and_hold_duration_notchlabel_default"), notchIndex: 0, value: 0 },
                    { label: t("capabilities_aap_press_and_hold_duration_notchlabel_shorter"), notchIndex: 1, value: 1 },
                    { label: t("capabilities_aap_press_and_hold_duration_notchlabel_shortest"), notchIndex: 2, value: 2 }
                  ]}
                  onChange={(n) => {handleNumberCapabilityChange("pressAndHoldDuration", n);}} />
              </PanelSectionRow>
            }


            {info?.capabilities?.pressSpeed != null &&
              <PanelSectionRow>
                <SliderField
                  value={info?.capabilities?.pressSpeed.selected}
                  max={2}
                  min={0}
                  step={1}
                  label={t("capabilities_aap_press_speed_label")}
                  notchCount={3}
                  notchTicksVisible={false}
                  notchLabels={[
                    { label: t("capabilities_aap_press_speed_notchlabel_default"), notchIndex: 0, value: 0 },
                    { label: t("capabilities_aap_press_speed_notchlabel_slower"), notchIndex: 1, value: 1 },
                    { label: t("capabilities_aap_press_speed_notchlabel_slowest"), notchIndex: 2, value: 2 }
                  ]}
                  onChange={(n) => {handleNumberCapabilityChange("pressSpeed", n);}} />
              </PanelSectionRow>
            }

            {info?.capabilities?.toneVolume != null &&
              <PanelSectionRow>
                <SliderField
                  value={info?.capabilities?.toneVolume.selected}
                  max={125}
                  min={15}
                  step={1}
                  label={t("capabilities_aap_tone_volume_label")}
                  notchCount={2}
                  notchTicksVisible={false}
                  showValue={true}
                  valueSuffix="%"
                  notchLabels={[
                    { label: "0", notchIndex: 0, value: 15 },
                    { label: "125", notchIndex: 1, value: 100 }
                  ]}
                  onChange={(n) => {handleNumberCapabilityChange("toneVolume", n);}} />
              </PanelSectionRow>
            }

            {info?.capabilities?.volumeSwipe != null &&
              <PanelSectionRow>
                <ToggleField checked={info?.capabilities?.volumeSwipe.selected} label={t("capabilities_aap_volume_swipe_label")}
                onChange={(b) => {handleBooleanCapabilityChange("volumeSwipe", b);}} />
              </PanelSectionRow>
            }

            {info?.capabilities?.volumeSwipeLength != null &&
              <PanelSectionRow>
                <SliderField
                  value={info?.capabilities?.volumeSwipeLength.selected}
                  max={2}
                  min={0}
                  step={1}
                  label={t("capabilities_aap_volume_swipe_length_label")}
                  notchCount={3}
                  notchTicksVisible={false}
                  notchLabels={[
                    { label: t("capabilities_aap_volume_swipe_length_notchlabel_default"), notchIndex: 0, value: 0 },
                    { label: t("capabilities_aap_volume_swipe_length_notchlabel_longer"), notchIndex: 1, value: 1 },
                    { label: t("capabilities_aap_volume_swipe_length_notchlabel_longest"), notchIndex: 2, value: 2 }
                  ]}
                  onChange={(n) => {handleNumberCapabilityChange("volumeSwipeLength", n);}} />
              </PanelSectionRow>
            }

            {info?.capabilities?.endCall != null && (
              <>
                <PanelSectionRow>
                  <SliderField
                    value={info?.capabilities?.endCall.selected}
                    max={3}
                    min={2}
                    step={1}
                    label={t("capabilities_aap_end_call_label")}
                    notchCount={2}
                    notchTicksVisible={false}
                    notchLabels={[
                      { label: t("capabilities_aap_end_call_notchlabel_double"), notchIndex: 0, value: 2 },
                      { label: t("capabilities_aap_end_call_notchlabel_single"), notchIndex: 1, value: 3 }
                    ]}
                    onChange={(n) => {handleNumberCapabilityChange("endCall", n);}} />
                </PanelSectionRow>

                <PanelSectionRow>
                  <SliderField
                    value={info?.capabilities?.endCall.selected == 2 ? 3 : 2}
                    max={3}
                    min={2}
                    step={1}
                    label={t("capabilities_aap_mute_unmute_label")}
                    notchCount={2}
                    notchTicksVisible={false}
                    notchLabels={[
                      { label: t("capabilities_aap_end_call_notchlabel_double"), notchIndex: 0, value: 2 },
                      { label: t("capabilities_aap_end_call_notchlabel_single"), notchIndex: 1, value: 3 }
                    ]}
                    disabled={true}
                  />
                </PanelSectionRow>
              </>
            )}
            </>
            )}
          </PanelSection>
        }
      </div>
    </>
  );
}