import {
  PanelSection,
  PanelSectionRow,
  gamepadDialogClasses,
  joinClassNames,
  SliderField,
  staticClasses,
  ToggleField
} from "@decky/ui";
import { t } from 'i18next';
import { useEffect, useState, FC } from 'react';
import { Battery } from "../components/battery";
import { Backend } from "../backend";
import { ANC_MODE_ADAPTIVE, ANC_MODE_ANC, ANC_MODE_OFF, ANC_MODE_TRANSPARENCY, ANC_MODE_WIND } from "../ButtonIcons";

const FieldWithSeparator = joinClassNames(
  gamepadDialogClasses.Field,
  gamepadDialogClasses.WithBottomSeparatorStandard
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

let sliderTimeoutId: NodeJS.Timeout;

let endCallTimeoutId: NodeJS.Timeout;
let pressAndHoldDurationTimeoutId: NodeJS.Timeout;
let pressSpeedTimeoutId: NodeJS.Timeout;
let toneVolumeTimeoutId: NodeJS.Timeout;
let volumeSwipeLengthTimeoutId: NodeJS.Timeout;
let adaptiveAudioNoiseTimeoutId: NodeJS.Timeout;

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

export const TabInfo: FC<{
  info?: headphoneInfoProps,
  setInfoValue: (value: headphoneInfoProps) => void,
  backend: Backend,
}> = ({ info, setInfoValue, backend }) => {

  const [config, setConfig] = useState<Awaited<ReturnType<typeof getAncSliderConfig>> | null>(null);  
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoaded(false);
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
  }, [info, backend]);

  return (
    <>
      <div style={{ marginLeft: "-8px", marginRight: "-8px" }}>
        {info == null && <div className={staticClasses.Text} style={{ paddingLeft: "16px", paddingRight: "16px" }}>{t("headphones_disconnected")}</div>}

        {info?.name != null && loaded == true &&
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

                    if (info?.capabilities?.anc != null) {
                      const clonedInfo = { ...info };
                      clonedInfo.capabilities.anc!.selected = v;
                      setInfoValue(clonedInfo);
                    };


                    if (sliderTimeoutId)
                      clearTimeout(sliderTimeoutId);

                    let starttime = Date.now();
                    sliderTimeoutId = setTimeout(() => {
                      backend.logInfo("Info: Elapsed:", Date.now() - starttime, "send set ANC to", v);
                      backend.setAnc(info!.address, v);
                    }, 350)
                  }} />
              </PanelSectionRow>
            }


            {info?.capabilities?.conversationAwareness != null &&
              <PanelSectionRow>
                <ToggleField checked={info?.capabilities?.conversationAwareness.selected} label="conversationAwareness" onChange={async (b) => {
                  if (info?.capabilities?.conversationAwareness != null) {
                    const clonedInfo = { ...info };
                    clonedInfo.capabilities.conversationAwareness!.selected = b;
                    setInfoValue(clonedInfo);
                    backend.logInfo("Send send conversationAwareness to", b);
                    backend.setCapability("conversationAwareness", info.address, b);
                  };
                }} />
              </PanelSectionRow>
            }

            {info?.capabilities?.personalizedVolume != null &&
              <PanelSectionRow>
                <ToggleField checked={info?.capabilities?.personalizedVolume.selected} label="personalizedVolume" onChange={async (b) => {
                  if (info?.capabilities?.personalizedVolume != null) {
                    const clonedInfo = { ...info };
                    clonedInfo.capabilities.personalizedVolume!.selected = b;
                    setInfoValue(clonedInfo);
                    backend.logInfo("Send send personalizedVolume to", b);
                    backend.setCapability("personalizedVolume", info.address, b);
                  };
                }} />
              </PanelSectionRow>
            }

            {info?.capabilities?.volumeSwipe != null &&
              <PanelSectionRow>
                <ToggleField checked={info?.capabilities?.volumeSwipe.selected} label="volumeSwipe" onChange={async (b) => {
                  if (info?.capabilities?.volumeSwipe != null) {
                    const clonedInfo = { ...info };
                    clonedInfo.capabilities.volumeSwipe!.selected = b;
                    setInfoValue(clonedInfo);
                    backend.logInfo("Send send volumeSwipe to", b);
                    backend.setCapability("volumeSwipe", info.address, b);
                  };
                }} />
              </PanelSectionRow>
            }

            {info?.capabilities?.ancOneAirPod != null &&
              <PanelSectionRow>
                <ToggleField checked={info?.capabilities?.ancOneAirPod.selected} label="ancOneAirPod" onChange={async (b) => {
                  if (info?.capabilities?.ancOneAirPod != null) {
                    const clonedInfo = { ...info };
                    clonedInfo.capabilities.ancOneAirPod!.selected = b;
                    setInfoValue(clonedInfo);
                    backend.logInfo("Send send ancOneAirPod to", b);
                    backend.setCapability("ancOneAirPod", info.address, b);
                  };
                }} />
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
                    label="endCall"
                    notchCount={2}
                    notchTicksVisible={false}
                    notchLabels={[
                      { label: "DoublePress", notchIndex: 0, value: 2 },
                      { label: "SinglePress", notchIndex: 1, value: 3 }
                    ]}
                    onChange={(n) => {
                      if (info?.capabilities?.endCall != null) {
                        const clonedInfo = { ...info };
                        clonedInfo.capabilities.endCall!.selected = n;
                        setInfoValue(clonedInfo);
                      };


                      if (endCallTimeoutId)
                        clearTimeout(endCallTimeoutId);

                      let starttime = Date.now();
                      endCallTimeoutId = setTimeout(() => {
                        if (info?.address) {
                          backend.logInfo("Info: Elapsed:", Date.now() - starttime, "Send set endCall to", n);
                          backend.setCapability("endCall", info!.address, n);
                        }
                      }, 350)

                    }} />
                </PanelSectionRow>

                <PanelSectionRow>
                  <SliderField
                    value={info?.capabilities?.endCall.selected == 2 ? 3 : 2}
                    max={3}
                    min={2}
                    step={1}
                    label="endCall"
                    notchCount={2}
                    notchTicksVisible={false}
                    notchLabels={[
                      { label: "DoublePress", notchIndex: 0, value: 2 },
                      { label: "SinglePress", notchIndex: 1, value: 3 }
                    ]}
                    disabled={true}
                  />
                </PanelSectionRow>
              </>
            )}


            {info?.capabilities?.pressAndHoldDuration != null &&
              <PanelSectionRow>
                <SliderField
                  value={info?.capabilities?.pressAndHoldDuration.selected}
                  max={2}
                  min={0}
                  step={1}
                  label="pressAndHoldDuration"
                  notchCount={3}
                  notchTicksVisible={false}
                  notchLabels={[
                    { label: "Default", notchIndex: 0, value: 0 },
                    { label: "Shorter", notchIndex: 1, value: 1 },
                    { label: "Shortest", notchIndex: 2, value: 2 }
                  ]}
                  onChange={(n) => {
                    if (info?.capabilities?.pressAndHoldDuration != null) {
                      const clonedInfo = { ...info };
                      clonedInfo.capabilities.pressAndHoldDuration!.selected = n;
                      setInfoValue(clonedInfo);
                    };


                    if (pressAndHoldDurationTimeoutId)
                      clearTimeout(pressAndHoldDurationTimeoutId);

                    let starttime = Date.now();
                    pressAndHoldDurationTimeoutId = setTimeout(() => {
                      if (info?.address) {
                        backend.logInfo("Info: Elapsed:", Date.now() - starttime, "Send set pressAndHoldDuration to", n);
                        backend.setCapability("pressAndHoldDuration", info!.address, n);
                      }
                    }, 350)

                  }} />
              </PanelSectionRow>
            }


            {info?.capabilities?.pressSpeed != null &&
              <PanelSectionRow>
                <SliderField
                  value={info?.capabilities?.pressSpeed.selected}
                  max={2}
                  min={0}
                  step={1}
                  label="pressSpeed"
                  notchCount={3}
                  notchTicksVisible={false}
                  notchLabels={[
                    { label: "Default", notchIndex: 0, value: 0 },
                    { label: "Slower", notchIndex: 1, value: 1 },
                    { label: "Slowest", notchIndex: 2, value: 2 }
                  ]}
                  onChange={(n) => {
                    if (info?.capabilities?.pressSpeed != null) {
                      const clonedInfo = { ...info };
                      clonedInfo.capabilities.pressSpeed!.selected = n;
                      setInfoValue(clonedInfo);
                    };


                    if (pressSpeedTimeoutId)
                      clearTimeout(pressSpeedTimeoutId);

                    let starttime = Date.now();
                    pressSpeedTimeoutId = setTimeout(() => {
                      if (info?.address) {
                        backend.logInfo("Info: Elapsed:", Date.now() - starttime, "Send set pressSpeed to", n);
                        backend.setCapability("pressSpeed", info!.address, n);
                      }
                    }, 350)

                  }} />
              </PanelSectionRow>
            }

            {info?.capabilities?.toneVolume != null &&
              <PanelSectionRow>
                <SliderField
                  value={info?.capabilities?.toneVolume.selected}
                  max={125}
                  min={15}
                  step={1}
                  label="toneVolume"
                  notchCount={2}
                  notchTicksVisible={false}
                  showValue={true}
                  valueSuffix="%"
                  notchLabels={[
                    { label: "0", notchIndex: 0, value: 15 },
                    { label: "125", notchIndex: 1, value: 100 }
                  ]}
                  onChange={(n) => {
                    if (info?.capabilities?.toneVolume != null) {
                      const clonedInfo = { ...info };
                      clonedInfo.capabilities.toneVolume!.selected = n;
                      setInfoValue(clonedInfo);
                    };


                    if (toneVolumeTimeoutId)
                      clearTimeout(toneVolumeTimeoutId);

                    let starttime = Date.now();
                    toneVolumeTimeoutId = setTimeout(() => {
                      if (info?.address) {
                        backend.logInfo("Info: Elapsed:", Date.now() - starttime, "Send set toneVolume to", n);
                        backend.setCapability("toneVolume", info!.address, n);
                      }
                    }, 350)

                  }} />
              </PanelSectionRow>
            }

            {info?.capabilities?.volumeSwipeLength != null &&
              <PanelSectionRow>
                <SliderField
                  value={info?.capabilities?.volumeSwipeLength.selected}
                  max={2}
                  min={0}
                  step={1}
                  label="volumeSwipeLength"
                  notchCount={3}
                  notchTicksVisible={false}
                  notchLabels={[
                    { label: "Default", notchIndex: 0, value: 0 },
                    { label: "Longer", notchIndex: 1, value: 1 },
                    { label: "Longest", notchIndex: 2, value: 2 }
                  ]}
                  onChange={(n) => {
                    if (info?.capabilities?.volumeSwipeLength != null) {
                      const clonedInfo = { ...info };
                      clonedInfo.capabilities.volumeSwipeLength!.selected = n;
                      setInfoValue(clonedInfo);
                    };


                    if (volumeSwipeLengthTimeoutId)
                      clearTimeout(volumeSwipeLengthTimeoutId);

                    let starttime = Date.now();
                    volumeSwipeLengthTimeoutId = setTimeout(() => {
                      if (info?.address) {
                        backend.logInfo("Info: Elapsed:", Date.now() - starttime, "Send set volumeSwipeLength to", n);
                        backend.setCapability("volumeSwipeLength", info!.address, n);
                      }
                    }, 350)

                  }} />
              </PanelSectionRow>
            }

            {info?.capabilities?.adaptiveAudioNoise != null &&
              <PanelSectionRow>
                <SliderField
                  value={info?.capabilities?.adaptiveAudioNoise.selected}
                  max={100}
                  min={0}
                  step={50}
                  label="adaptiveAudioNoise"
                  notchCount={3}
                  notchTicksVisible={false}
                  notchLabels={[
                    { label: "More noise", notchIndex: 0, value: 0 },
                    { label: "Default", notchIndex: 1, value: 50 },
                    { label: "Less noise", notchIndex: 2, value: 100 }
                  ]}
                  onChange={(n) => {
                    if (info?.capabilities?.adaptiveAudioNoise != null) {
                      const clonedInfo = { ...info };
                      clonedInfo.capabilities.adaptiveAudioNoise!.selected = n;
                      setInfoValue(clonedInfo);
                    };


                    if (adaptiveAudioNoiseTimeoutId)
                      clearTimeout(adaptiveAudioNoiseTimeoutId);

                    let starttime = Date.now();
                    adaptiveAudioNoiseTimeoutId = setTimeout(() => {
                      if (info?.address) {
                        backend.logInfo("Info: Elapsed:", Date.now() - starttime, "Send set adaptiveAudioNoise to", n);
                        backend.setCapability("adaptiveAudioNoise", info!.address, n);
                      }
                    }, 350)

                  }} />
              </PanelSectionRow>
            }



































          </PanelSection>
        }
      </div>
    </>
  );
}