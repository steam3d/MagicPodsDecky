import {
  PanelSection,
  PanelSectionRow,
  gamepadDialogClasses,
  joinClassNames,
  SliderField,
  staticClasses
} from "decky-frontend-lib";
import { t } from 'i18next';
import { VFC } from 'react';
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

interface BatteryProps {
  single: BatteryDataProps,
  left: BatteryDataProps,
  right: BatteryDataProps,
  case: BatteryDataProps,
}

interface CapabilitiesProps {
  anc?: number,
}

export interface headphoneInfoProps {
  name: string;
  address: string;
  connected: boolean;
  battery: BatteryProps;
  capabilities: CapabilitiesProps;
}

let sliderTimeoutId: NodeJS.Timeout;

export const TabInfo: VFC<{
  info?: headphoneInfoProps,
  setInfoValue: (value: headphoneInfoProps) => void,
  backend: Backend,
}> = ({ info, setInfoValue, backend }) => {
  return (
    <>
      <div style={{ marginLeft: "-8px", marginRight: "-8px" }}>
        {info == null && <div className={staticClasses.Text} style={{ paddingLeft: "16px", paddingRight: "16px" }}>{t("headphones_disconnected")}</div>}

        {info != null &&
          <PanelSection title={info.name}>
            <PanelSectionRow>
              <div className={FieldWithSeparator}>
                <div style={{ display: "flex", padding: "0px 0px 0px 0px" }}>
                  <Battery title={t("battery_single")} battery={info.battery.single.battery} isCharging={info.battery.single.charging} status={info.battery.single.status} />
                  <Battery title={t("battery_left")} battery={info.battery.left.battery} isCharging={info.battery.left.charging} status={info.battery.left.status} />
                  <Battery title={t("battery_right")} battery={info.battery.right.battery} isCharging={info.battery.right.charging} status={info.battery.right.status} />
                  <Battery title={t("battery_case")} battery={info.battery.case.battery} isCharging={info.battery.case.charging} status={info.battery.case.status} />
                </div>
              </div>
            </PanelSectionRow>

            {info.capabilities.anc != null &&
              <PanelSectionRow>
                <SliderField
                  value={info?.capabilities.anc}
                  max={3}
                  min={1}
                  step={1}
                  label={t("capabilities_noisecancellation_label")}
                  notchCount={3}
                  notchTicksVisible={true}
                  notchLabels={[
                    { label: t("capabilities_noisecancellation_notchlabel_off"), notchIndex: 0, value: 1 },
                    { label: t("capabilities_noisecancellation_notchlabel_transparency"), notchIndex: 1, value: 2 },
                    { label: t("capabilities_noisecancellation_notchlabel_anc"), notchIndex: 2, value: 3 },
                  ]}
                  onChange={(n) => {
                    backend.log("ANC slider changed to", n);
                    if (info?.capabilities.anc != null) {
                      const clonedInfo = { ...info };
                      clonedInfo.capabilities.anc = n;
                      setInfoValue(clonedInfo);
                    };

                    if (sliderTimeoutId)
                      clearTimeout(sliderTimeoutId);

                    let starttime = Date.now();
                    sliderTimeoutId = setTimeout(() => {
                      backend.log(n, "Elapsed", Date.now() - starttime);
                      backend.setAnc(info!.address, n);
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