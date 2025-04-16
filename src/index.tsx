import {
  definePlugin,
  staticClasses,
  Tabs,
  DialogButton
} from "@decky/ui";
import {
  call,
  routerHook,
  toaster
 } from "@decky/api";

import initI18n from "./i18n";
import { t } from 'i18next';

import { FC, useState, useEffect } from 'react';
import { BatteryDataProps, TabInfo, headphoneInfoProps } from "./tab/tabInfo";

import { TabHeadphones, defaultBluetoothProps } from "./tab/tabHeadphones";
import { headphonesListProps } from "./tab/tabHeadphones";
import { TabSettings } from "./tab/tapSettings";

import { Backend, BackendSocketState } from "./backend";
import { LogoIcon } from "./icons";
import { LogRouter } from "./pages/log";
import { BackgroundMicrophoneMute } from "./bgMicMute";

const Content: FC<{ backend: Backend }> = ({ backend }) => {
  useEffect(() => {
    backend.logInfo("Index: Starting UI");

    backend.onSocketConnectionChanged(onConnectionChanged);
    backend.onJsonMessageReceived(onJsonMessageReceived);

    const state = backend.getSocketState();
    onConnectionChanged(state);

    return () => {
      backend.offSocketConnectionChanged(onConnectionChanged);
      backend.offJsonMessageReceived(onJsonMessageReceived);
    };


  }, []);

  const onConnectionChanged = (state: BackendSocketState) => {
    if (state === BackendSocketState.OPEN) {
      setConnectionErrorValue(false);
      setIsButtonDisabledValue(true);
      backend.getAll();
    }

    if (state === BackendSocketState.ERROR) {
      setConnectionErrorValue(true);
      setIsButtonDisabledValue(false);
    }
  };

  const onJsonMessageReceived = (lastJsonMessage: object) => {
    backend.logDebug("Index: Json message received");

    if (lastJsonMessage === null) {
      return;
    }

    const typedJson = lastJsonMessage as { info?: headphoneInfoProps,  defaultbluetooth?: defaultBluetoothProps, headphones?: headphonesListProps[]};

    if (typedJson?.info != null) {
      setInfoValue(Object.keys(typedJson.info).length === 0? undefined: typedJson.info as headphoneInfoProps);
    }

    if (typedJson?.defaultbluetooth != null) {
      setDefaultBluetoothValue(Object.keys(typedJson.defaultbluetooth).length === 0 ? undefined : typedJson.defaultbluetooth as defaultBluetoothProps);
    }

    if (typedJson?.headphones != null) {
      setHeadphonesValue(typedJson.headphones.length === 0 ? [] : typedJson.headphones as headphonesListProps[]);
    }

  };

  const [headphonesValue, setHeadphonesValue] = useState<headphonesListProps[]>([]);
  const [infoValue, setInfoValue] = useState<headphoneInfoProps>();
  const [defaultBluetoothValue, setDefaultBluetoothValue] = useState<defaultBluetoothProps>();
  const [connectionErrorValue, setConnectionErrorValue] = useState<boolean>(false);
  const [isButtonDisabledValue, setIsButtonDisabledValue] = useState<boolean>(false);
  const [currentTabRoute, setCurrentTabRoute] = useState<string>("info");

  return (
    <>

<style>
{`
.magicpods-tabs > div > div:first-child::before {
  background: #0D141C;
  box-shadow: none;
  backdrop-filter: none;
}
`}
</style>

    <div className="magicpods-tabs" style={{ height: "95%", width: "300px", position: "fixed", marginTop: "-12px", overflow: "hidden" }}>
      {connectionErrorValue &&
        <div style={{ display: "flex", paddingTop: "12px", paddingLeft: "16px", paddingRight: "16px", alignItems: "center" }}>
          <div className={staticClasses.Text} style={{ paddingRight: "8px", width: "100%" }}>
            {t("websocket_connection_issue")}
          </div>
          <DialogButton disabled={isButtonDisabledValue} style={{ height: "28px", width: "40px", minWidth: "40px", padding: "10px 12px" }}
            onClick={async () => {
              backend.logDebug("Index: Restarting backend");
              setIsButtonDisabledValue(true);
              await call<[], void>("restart_backend");
              backend.connect();
              backend.logInfo("Index: Backend restarted");
            }}>
            <svg style={{ display: "block", marginTop: "-4px" }} width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.0608 4.48844C11.8828 4.38507 12.4653 3.63495 12.3619 2.81299C12.2586 1.99104 11.5084 1.40851 10.6865 1.51188C5.97823 2.10399 2.1833 5.83131 1.58187 10.6572C0.925634 15.9227 4.27647 20.8622 9.41005 22.1733C14.5452 23.4847 19.8439 20.7515 21.7747 15.8084C23.1662 12.2459 22.4971 8.33342 20.2724 5.47532C20.9708 5.34719 21.5 4.7354 21.5 4C21.5 3.17157 20.8284 2.5 20 2.5H16C15.1716 2.5 14.5 3.17157 14.5 4V8C14.5 8.82843 15.1716 9.5 16 9.5C16.8284 9.5 17.5 8.82843 17.5 8V6.84125C19.4093 8.91101 20.0578 11.9584 18.9803 14.7169C17.5981 18.2556 13.8121 20.2012 10.1524 19.2666C6.4911 18.3315 4.08842 14.8028 4.55884 11.0282C4.98961 7.57163 7.70599 4.91034 11.0608 4.48844Z" fill="currentColor" /></svg>
          </DialogButton>
        </div>}
      <Tabs
        activeTab={currentTabRoute}
        // @ts-ignore
        onShowTab={(tabID: string) => {
          setCurrentTabRoute(tabID);
        }}

        tabs={[
          {
            // @ts-ignore
            title: <svg style={{ display: "block" }} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.9248 8.93341H12.3498V2.93341C12.3498 1.53341 11.5914 1.25008 10.6664 2.30008L9.99977 3.05841L4.3581 9.47508C3.5831 10.3501 3.9081 11.0667 5.07477 11.0667H7.64977V17.0667C7.64977 18.4667 8.4081 18.7501 9.3331 17.7001L9.99977 16.9417L15.6414 10.5251C16.4164 9.65008 16.0914 8.93341 14.9248 8.93341Z" fill="currentColor" /></svg>,
            content: <TabInfo info={infoValue} setInfoValue={setInfoValue} backend={backend} />,
            id: "info",
          },
          {
            // @ts-ignore
            title: <svg style={{ display: "block" }} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M1.66652 14.9163L1.66667 14.93V15.1167C1.66667 16.8667 3.09167 18.2917 4.84167 18.2917H4.95C6.7 18.2917 8.125 16.8667 8.125 15.1167V13.55C8.125 11.8 6.7 10.375 4.95 10.375H4.84167C4.1186 10.375 3.45102 10.6183 2.91652 11.0272V10.1497C2.88318 8.21634 3.59152 6.40801 4.92485 5.04967C6.24985 3.69967 8.03318 2.95801 9.95818 2.95801C13.8915 2.95801 17.0832 6.15801 17.0832 10.083V11.027C16.5487 10.6182 15.8813 10.375 15.1583 10.375H15.05C13.3 10.375 11.875 11.8 11.875 13.55V15.1167C11.875 16.8667 13.3 18.2917 15.05 18.2917H15.1583C16.9083 18.2917 18.3333 16.8667 18.3333 15.1167V13.55C18.3333 13.5396 18.3333 13.5292 18.3332 13.5188V10.083C18.3332 5.46634 14.5748 1.70801 9.95818 1.70801C7.69985 1.70801 5.59985 2.58301 4.03318 4.17467C2.46652 5.77467 1.62485 7.90801 1.66652 10.1663V14.9163Z" fill="currentColor" /></svg>,
            content: <TabHeadphones defaultBluetooth={defaultBluetoothValue} setDefaultBluetooth={setDefaultBluetoothValue} headphones={headphonesValue} setHeadphones={setHeadphonesValue} backend={backend} />,
            id: "headphones",
          },
          {
            // @ts-ignore
            title: <svg style={{ display: "block" }} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.7834 4.51686L11.4751 2.0252C10.6501 1.5502 9.3584 1.5502 8.5334 2.0252L4.1834 4.53353C2.4584 5.7002 2.3584 5.8752 2.3584 7.73353V12.2585C2.3584 14.1169 2.4584 14.3002 4.21673 15.4835L8.52506 17.9752C8.94173 18.2169 9.47507 18.3335 10.0001 18.3335C10.5251 18.3335 11.0584 18.2169 11.4667 17.9752L15.8167 15.4669C17.5417 14.3002 17.6417 14.1252 17.6417 12.2669V7.73353C17.6417 5.8752 17.5417 5.7002 15.7834 4.51686ZM10.0001 12.7085C8.5084 12.7085 7.29173 11.4919 7.29173 10.0002C7.29173 8.50853 8.5084 7.29186 10.0001 7.29186C11.4917 7.29186 12.7084 8.50853 12.7084 10.0002C12.7084 11.4919 11.4917 12.7085 10.0001 12.7085Z" fill="currentColor" /></svg>,
            content: <TabSettings backend={backend} />,
            id: "settings",
          }
          /*,{
            // @ts-ignore
            title: <svg style={{ display: "block" }} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.7497 5.78366C16.7497 6.23366 16.508 6.64199 16.1247 6.85033L14.6747 7.63366L13.4413 8.29199L10.883 9.67533C10.608 9.82533 10.308 9.90033 9.99968 9.90033C9.69134 9.90033 9.39134 9.82533 9.11634 9.67533L3.87467 6.85033C3.49134 6.64199 3.24967 6.23366 3.24967 5.78366C3.24967 5.33366 3.49134 4.92533 3.87467 4.71699L5.51634 3.83366L6.82467 3.12533L9.11634 1.89199C9.66634 1.59199 10.333 1.59199 10.883 1.89199L16.1247 4.71699C16.508 4.92533 16.7497 5.33366 16.7497 5.78366ZM8.24993 10.6588L3.37493 8.22544C2.99994 8.03378 2.5666 8.05878 2.20827 8.27544C1.84993 8.49211 1.6416 8.87544 1.6416 9.29211V13.9004C1.6416 14.7004 2.08327 15.4171 2.79993 15.7754L7.67493 18.2088C7.8416 18.2921 8.02494 18.3338 8.20827 18.3338C8.42494 18.3338 8.6416 18.2754 8.83327 18.1504C9.1916 17.9338 9.39993 17.5504 9.39993 17.1338V12.5254C9.40827 11.7338 8.9666 11.0171 8.24993 10.6588ZM18.3581 13.9V9.29169C18.3581 8.87502 18.1414 8.49169 17.7914 8.27502C17.4331 8.05002 16.9997 8.03336 16.6247 8.22502L14.7914 9.14169L13.5414 9.76669L11.7497 10.6584C11.0331 11.0167 10.5914 11.7334 10.5914 12.5334V17.1334C10.5914 17.55 10.8081 17.9334 11.1581 18.15C11.3581 18.275 11.5747 18.3334 11.7914 18.3334C11.9747 18.3334 12.1581 18.2917 12.3247 18.2084L17.1997 15.7667C17.9164 15.4084 18.3581 14.6917 18.3581 13.9Z" fill="currentColor"/></svg>,
            content: <TabDebug backend={backend} />,
            id: "debug",
          }*/
        ]}
      />
    </div>
    </>
  );
};

export default definePlugin(() => {
  initI18n();

  let AllowLowBatteryNotification = true;

  const onConnectionChanged = (state: BackendSocketState) => {
    if (state === BackendSocketState.ERROR) {
      toaster.toast({
        icon: <LogoIcon />,
        title: "MagicPods",
        duration: 15_000,
        body: t("notif_error_websocket_connection_issue")
      })
    }
  };

  const onJsonMessageReceived = async (json: object) => {
    backend.logDebug("LowBattNotif: Json message received");

    const typedJson = json as { info?: headphoneInfoProps };

    if (typedJson?.info == null)
      return;

    if (Object.keys(typedJson.info).length !== 0) {

      const lowBatterySettingValue = await backend.loadNumberSetting("notif_low_battery") ?? 0;

      if (lowBatterySettingValue <= 0)
        return;

      const info = typedJson.info as headphoneInfoProps;

      if (info.capabilities.battery == null)
        return;

      let minBattery = 100;

      for (let key of ["single", "left", "right", "case"] as const) {

        let battery = info.capabilities.battery[key] as BatteryDataProps

        if (battery.status === 2 &&
          battery.charging === false &&
          battery.battery !== 0 && // Sometimes headphones send battery 0 and immediately update battery to real value
          battery.battery < minBattery) {
          minBattery = battery.battery;
        }
      }

      if (AllowLowBatteryNotification &&
        minBattery <= lowBatterySettingValue) {
        AllowLowBatteryNotification = false;
        backend.logInfo(`LowBattNotif: Showing low battery notification ${minBattery}%`);
        toaster.toast({
          icon: <LogoIcon />,
          title: "MagicPods",
          body: t("notif_low_battery", { battery: minBattery })
        })
      }
    }
    else {
      backend.logInfo("LowBattNotif: Empty info allow low battery notification");
      AllowLowBatteryNotification = true;
    }
  }

  const backend = new Backend();
  backend.onSocketConnectionChanged(onConnectionChanged);
  backend.onJsonMessageReceived(onJsonMessageReceived);
  routerHook.addRoute("/magicpods-log", () => (<LogRouter backend={backend} />));
  routerHook.addGlobalComponent("BackgroundMicrophoneMute", () => (<BackgroundMicrophoneMute backend={backend} />));
  backend.logInfo("Plugin: Loaded");

  return {
    title: <div className={staticClasses.Title}>MagicPods</div>,
    content: <Content backend={backend} />,
    icon: <LogoIcon />,
    onDismount() {
      backend.logInfo("Plugin: Dismounting");
      routerHook.removeRoute("/magicpods-log");
      routerHook.removeGlobalComponent("BackgroundMicrophoneMute");
      backend.offSocketConnectionChanged(onConnectionChanged);
      backend.offJsonMessageReceived(onJsonMessageReceived);
      backend.bgAncSwitch.disable();
      backend.player.disable();
      backend.disconnect();
    },
  };
});
