import {
  PanelSection,
  PanelSectionRow,
  gamepadDialogClasses,
  joinClassNames,
  SliderField,
  staticClasses
} from "@decky/ui";
import { t } from 'i18next';
import { useEffect, useState, FC } from 'react';
import { Battery } from "../components/battery";
import { Backend } from "../backend";

const FieldWithSeparator = joinClassNames(
  gamepadDialogClasses.Field,
  gamepadDialogClasses.WithBottomSeparatorStandard
)

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

interface CapabilitiesProps {
  anc?: AncProps;
  battery?: BatteryProps;
}

export interface headphoneInfoProps {
  name: string;
  address: string;
  connected: boolean;

  capabilities: CapabilitiesProps;
}

let sliderTimeoutId: NodeJS.Timeout;



export const AncModes = {
  OFF: 1,
  TRANSPARENCY: 2,
  ADAPTIVE: 4,
  WIND: 8,
  ANC: 16,
};

const getAncSliderConfig = async (backend: Backend, options: number, selected: number) => {
  backend.log("Info: Options:", options, "Selected:", selected);

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
    _labels.push({ label: t("capabilities_noisecancellation_notchlabel_off"), notchIndex: _count - 1, value: _count },);
    _convertBack[_count] = AncModes.OFF;
    if ((selected & AncModes.OFF) != 0) _selectedIndex = _count;
  }

  if (isTransparency && (options & AncModes.TRANSPARENCY) != 0) {
    _count += 1;
    _labels.push({ label: t("capabilities_noisecancellation_notchlabel_transparency"), notchIndex: _count - 1, value: _count },);
    _convertBack[_count] = AncModes.TRANSPARENCY;
    if ((selected & AncModes.TRANSPARENCY) != 0) _selectedIndex = _count;
  }

  if (isAdaptive && (options & AncModes.ADAPTIVE) != 0) {
    _count += 1;
    _labels.push({ label: t("capabilities_noisecancellation_notchlabel_adaptive"), notchIndex: _count - 1, value: _count },);
    _convertBack[_count] = AncModes.ADAPTIVE;
    if ((selected & AncModes.ADAPTIVE) != 0) _selectedIndex = _count;
  }

  if (isWind && (options & AncModes.WIND) != 0) {
    _count += 1;
    _labels.push({ label: t("capabilities_noisecancellation_notchlabel_wind"), notchIndex: _count - 1, value: _count },);
    _convertBack[_count] = AncModes.WIND;
    if ((selected & AncModes.WIND) != 0) _selectedIndex = _count;
  }

  if (isAnc && (options & AncModes.ANC) != 0) {
    _count += 1;
    _labels.push({ label: t("capabilities_noisecancellation_notchlabel_anc"), notchIndex: _count - 1, value: _count },);
    _convertBack[_count] = AncModes.ANC;
    if ((selected & AncModes.ANC) != 0) _selectedIndex = _count;
  }

  backend.log("Info: SelectedIndex:", _selectedIndex, "Count:", _count, "ConvertBackDict:", _convertBack, "Label:", _labels);

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


  useEffect(() => {
    const fetchConfig = async () => {
      if (info?.capabilities?.anc != null) {
        const result = await getAncSliderConfig(backend, info.capabilities.anc.options, info.capabilities.anc.selected);
        setConfig(result);
      } else {
        setConfig(null);
      }
    };

    fetchConfig();
  }, [info, backend]);

  return (
    <>
      <div style={{ marginLeft: "-8px", marginRight: "-8px" }}>
        {info == null && <div className={staticClasses.Text} style={{ paddingLeft: "16px", paddingRight: "16px" }}>{t("headphones_disconnected")}</div>}

        {info?.capabilities?.battery != null &&
          <PanelSection title={info.name}>
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

            {info?.capabilities?.anc != null && config != null &&
              <PanelSectionRow>
                <SliderField
                  value={config.value}
                  max={config.max}
                  min={1}
                  step={1}
                  label={t("capabilities_noisecancellation_label")}
                  notchCount={config.notchCount}
                  notchTicksVisible={true}
                  notchLabels={config.labels}
                  onChange={(n) => {
                    const v = config.convert[n] ?? 0;
                    backend.log("Info: ANC slider changed to UI:", n, "Native:", v);
                    if (info?.capabilities?.anc != null) {
                      const clonedInfo = { ...info };
                      clonedInfo.capabilities.anc!.selected = v;
                      setInfoValue(clonedInfo);
                    };

                    if (sliderTimeoutId)
                      clearTimeout(sliderTimeoutId);

                    let starttime = Date.now();
                    sliderTimeoutId = setTimeout(() => {
                      backend.log("Info: Elapsed:", Date.now() - starttime, "send set ANC to", v);
                      backend.setAnc(info!.address, v);
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