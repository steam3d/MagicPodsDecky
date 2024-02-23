export declare global {
    const SteamClient: {
      System: {
        Bluetooth: {
          SetEnabled: (enabled: boolean) => Promise<void>;
          RegisterForStateChanges: ((cb: (change: BluetoothStateChange) => void) => undefined);
        };
      };
    };
  }

  export interface BluetoothStateChange {
    bEnabled: boolean;
    vecAdapters: Adapter[];
    vecDevices: Device[];
  }


export interface Adapter extends baseBluetoothEntity {
    bEnabled: boolean;
    bDiscovering: boolean;
  }

  export interface Device extends baseBluetoothEntity {
    nAdapterId: number;
    eType: number; // Maps to a BluetoothDeviceType;
  }
