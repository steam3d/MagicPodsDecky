/// <reference path="../typings/index.d.ts" />
import {
  PanelSection,
  PanelSectionRow,
  ToggleField,
} from "@decky/ui";
import { t } from 'i18next';
import { FC, useState, useEffect } from 'react';
import { Backend } from "../backend";


export interface headphonesListProps {
  name: string;
  address: string;
  connected: boolean;
}

export interface defaultBluetoothProps {
  enabled: boolean;
}

export const TabHeadphones: FC<{
  defaultBluetooth?: defaultBluetoothProps,
  setDefaultBluetooth?: (value?: defaultBluetoothProps | ((prevVar?: defaultBluetoothProps) => defaultBluetoothProps)) => void,
  headphones: headphonesListProps[],
  setHeadphones: (value: headphonesListProps[] | ((prevVar: headphonesListProps[]) => headphonesListProps[])) => void,
  backend: Backend;
}> = ({ defaultBluetooth, setDefaultBluetooth, headphones, setHeadphones, backend }) => {

  const [disabledHeadphones, setDisabledHeadphones] = useState<Record<string, boolean>>({});
  const [checkedHeadphones, setCheckedHeadphones] = useState<Record<string, boolean>>({});

  const handleToggleFieldChange = (address: string, disabled: boolean) => {
    setDisabledHeadphones((prevState) => ({
      ...prevState,
      [address]: true,
    }));

    backend.log("Updated setCheckedHeadphones");
    setCheckedHeadphones((prevState) => ({
      ...prevState,
      [address]: disabled,
    }));

  };

  useEffect(() => {
    backend.log("Updated headphones");
    setDisabledHeadphones({});

    headphones.forEach(headphone => {
      setCheckedHeadphones((prevState) => ({
        ...prevState,
        [headphone.address]: headphone.connected,
      }));
    });
  }, [headphones]);

  // const updateDeviceConnectedState = (address: string, isConnected: boolean) => {
  //   setHeadphones(prevState => {
  //     return prevState.map(device => {
  //       if (device.address === address) {
  //         return {
  //           ...device,
  //           connected: isConnected
  //         };
  //       }
  //       return device;
  //     });
  //   });
  // };

  // SteamClient.System.Bluetooth.RegisterForStateChanges((change: BluetoothStateChange)  => {
  //   setBluetoothAdapterEnabled(change.bEnabled);
  // });

  const onChangeBluetoothAdapterToggleField = (b: boolean) => {
    if (setDefaultBluetooth != null)
        setDefaultBluetooth({ enabled: b });

    if (b){
      backend.enableDefaultBluetoothAdapter();
    }
    else{
      backend.disableDefaultBluetoothAdapter();
    }
    //void SteamClient.System.Bluetooth.SetEnabled(b); // disabled due SteamClient.System.Bluetooth is not available since Steam Deck OS 3.5.19
  };

  return (
    <>
      <div style={{ marginLeft: "-8px", marginRight: "-8px" }}>
        {defaultBluetooth &&
          <PanelSection>
            <PanelSectionRow>
              <ToggleField checked={defaultBluetooth.enabled} label={t("bluetooth")} onChange={onChangeBluetoothAdapterToggleField} />
            </PanelSectionRow>
          </PanelSection>}

        {(headphones.length !== 0) &&
          <PanelSection title={t("headphones")}>
            {headphones.map((headphone, index) => (
              <PanelSectionRow>
                <ToggleField checked={checkedHeadphones[headphone.address]} label={headphone.name} disabled={disabledHeadphones[headphone.address]} onChange={(b) => {
                  backend.log(`Change connection to ${b} for ${headphone.name} (${headphone.address})`);
                  handleToggleFieldChange(headphone.address, b);
                  if (b){
                    backend.connectDevice(headphone.address);
                  }
                  else{
                    backend.disconnectDevice(headphone.address);
                  }
                }} />
              </PanelSectionRow>
            ))}
          </PanelSection>
        }
      </div>
    </>
  )
}