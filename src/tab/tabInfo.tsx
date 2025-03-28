import {
  PanelSection,
  PanelSectionRow,
  gamepadDialogClasses,
  joinClassNames,
  SliderField,
  staticClasses
} from "decky-frontend-lib";
import { t } from 'i18next';
import { useEffect, useState, VFC } from 'react';
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
  anc?:AncProps;
  battery?: BatteryProps;
}

export interface headphoneInfoProps {
  name: string;
  address: string;
  connected: boolean;

  capabilities: CapabilitiesProps;
}

let sliderTimeoutId: NodeJS.Timeout;



const AncMode = {
  OFF: 1,
  TRANSPARENCY: 2,
  ADAPTIVE: 4,
  WIND: 8,
  ANC: 16,
};

const getAncSliderConfig = async (backend: Backend, options: number, selected: number) => {
    backend.log("Options: ", options);
    backend.log("Selected: ", selected);

    let _count = 0;
    let _selectedIndex = 0;
    let _labels = [];
    let _convertBack: { [key: number]: number } = {};


    const enableToggleAncModeOffValue = (await backend.deckyApi.callPluginMethod("load_setting", { key: "allow_anc_mode_off" })).result;
    const enableToggleAncModeTransparencyValue = (await backend.deckyApi.callPluginMethod("load_setting", { key: "allow_anc_mode_transparency" })).result;
    const enableToggleAncModeAdaptiveValue = (await backend.deckyApi.callPluginMethod("load_setting", { key: "allow_anc_mode_adaptive" })).result;
    const enableToggleAncModeWindValue = (await backend.deckyApi.callPluginMethod("load_setting", { key: "allow_anc_mode_wind" })).result;
    const enableToggleAncModeAncValue = (await backend.deckyApi.callPluginMethod("load_setting", { key: "allow_anc_mode_anc" })).result;

    let isOff = String(enableToggleAncModeOffValue).toLowerCase() == "true";
    let isTransparency = String(enableToggleAncModeTransparencyValue).toLowerCase() == "true";
    let isAdaptive = String(enableToggleAncModeAdaptiveValue).toLowerCase() == "true";
    let isWind = String(enableToggleAncModeWindValue).toLowerCase() == "true";
    let isAnc = String(enableToggleAncModeAncValue).toLowerCase() == "true";

    const trueCount = [isOff, isTransparency, isAdaptive, isWind, isAnc].filter(Boolean).length;
    if (trueCount < 2)
      return null;

    //The order is important OFF->TRA->ADAP->WIND->ANC
    if (isOff && (options & AncMode.OFF) != 0){
        _count += 1;
        _labels.push( { label: t("capabilities_noisecancellation_notchlabel_off"), notchIndex: _count-1, value: _count },);
        _convertBack[_count] = AncMode.OFF;
        if ((selected & AncMode.OFF) != 0 ) _selectedIndex = _count;
    }

    if (isTransparency && (options & AncMode.TRANSPARENCY) != 0){
        _count += 1;
        _labels.push( { label: t("capabilities_noisecancellation_notchlabel_transparency"), notchIndex: _count-1, value: _count },);
        _convertBack[_count] = AncMode.TRANSPARENCY;
        if ((selected & AncMode.TRANSPARENCY) != 0 ) _selectedIndex = _count;
    }

    if (isAdaptive && (options & AncMode.ADAPTIVE) != 0){
        _count += 1;
        _labels.push( { label: t("capabilities_noisecancellation_notchlabel_adaptive"), notchIndex: _count-1, value: _count },);
        _convertBack[_count] = AncMode.ADAPTIVE;
        if ((selected & AncMode.ADAPTIVE) != 0 ) _selectedIndex = _count;
    }

    if (isWind && (options & AncMode.WIND) != 0){
        _count += 1;
        _labels.push( { label: t("capabilities_noisecancellation_notchlabel_wind"), notchIndex: _count-1, value: _count },);
        _convertBack[_count] = AncMode.WIND;
        if ((selected & AncMode.WIND) != 0 ) _selectedIndex = _count;
    }

    if (isAnc && (options & AncMode.ANC) != 0){
        _count += 1;
        _labels.push( { label: t("capabilities_noisecancellation_notchlabel_anc"), notchIndex: _count-1, value: _count },);
        _convertBack[_count] = AncMode.ANC;
        if ((selected & AncMode.ANC) != 0 ) _selectedIndex = _count;
    }

    backend.log("Options count", _count);
    backend.log("Selected index", _selectedIndex);
    backend.log(_labels);
    backend.log(_convertBack);

    return {
      value: _selectedIndex,
      max: _count,
      notchCount: _count,
      labels: _labels,
      convert: _convertBack,
    };

    };

export const TabInfo: VFC<{
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
                    backend.log("ANC slider changed to", n);
                    const v = config.convert[n] ?? 0;
                    backend.log("Covert", n, "to", v);
                    if (info?.capabilities?.anc != null) {
                      const clonedInfo = { ...info };
                      clonedInfo.capabilities.anc!.selected = v;
                      setInfoValue(clonedInfo);
                    };

                    if (sliderTimeoutId)
                      clearTimeout(sliderTimeoutId);

                    let starttime = Date.now();
                    sliderTimeoutId = setTimeout(() => {
                      backend.log(n, "Elapsed", Date.now() - starttime);
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