import { Backend } from "./backend";
import { headphoneInfoProps } from "./tab/tabInfo";

export const enum Keys {
    R2 = 0,
    L2 = 1,
    R1 = 2,
    L1 = 3,
    Y = 4,
    B = 5,
    X = 6,
    A = 7,
    UP = 8,
    RIGHT = 9,
    LEFT = 10,
    DOWN = 11,
    SELECT = 12,
    STEAM = 13,
    START = 14,
    //QAM = ??
    L5 = 15,
    R5 = 16,

}

export class Controller {
    private keyPressingTime = Date.now();
    private key = -1;
    private backend;
    private input_register: any | undefined;
    private anc = 0;
    private address = "";
    private enabled = false;
    private connected = false;


    constructor(backend: Backend) {
        this.backend = backend;
        this.backend.onJsonMessageReceived(this.onJsonMessageReceived);
        this.updateSetting();
    }

    async updateSetting() {
        const enableSwitchAncValue = (await this.backend.deckyApi.callPluginMethod("load_setting", { key: "anc_l5_r5_switch" })).result;
        this.enabled = (String(enableSwitchAncValue).toLowerCase() == "true");
        this.backend.log(`Update hotkey setting to: ${this.enabled}`)

        // Make action only when headphones connected
        if (this.connected) {
            if (this.enabled){
                this.register();
            }
            else{
                this.unregister();
            }
        }
    }

    // Manual unregister hotkey
    disable() {
        this.backend.offJsonMessageReceived(this.onJsonMessageReceived);
        this.unregister();
    }

    private onJsonMessageReceived = (json: object) => {
        this.backend.log("Process hotkey message");

        if (!json.hasOwnProperty("info"))
        return;

        if (Object.keys(json["info"]).length !== 0) {
            const info = json["info"] as headphoneInfoProps;
            if (info.capabilities.anc != null) {
                if (this.anc !== info.capabilities.anc)
                    this.anc = info.capabilities.anc

                if (this.address !== info.address)
                    this.address = info.address;

                if (this.connected !== true)
                    this.connected = true;

                this.register();
            }

        }
        else {
            this.unregister();
            this.anc = 0;
            this.address = "";
            this.connected = false;
        }
    }

    private register() {
        if (this.enabled && this.input_register == null) {
            this.input_register = window.SteamClient.Input.RegisterForControllerStateChanges(this.handleButtonInput);
            this.backend.log("Hotkey registered")
        }
    }

    private unregister() {
        if (this.input_register != null) {
            this.input_register.unregister();
            this.input_register = undefined;
            this.backend.log("Hotkey unregistered")
        }
    }

    private handleButtonInput = async (val: any[]) => {
        for (const inputs of val) {
            if (inputs.ulButtons && inputs.ulButtons & (1 << Keys.L5) && inputs.ulButtons & (1 << Keys.R5)) {
                if (this.key != inputs.ulButtons && Date.now() - this.keyPressingTime > 350) {
                    this.keyPressingTime = Date.now();
                    this.key = inputs.ulButtons;
                    this.backend.log(inputs.ulButtons);

                    // The same order as when you press stem of an AirPod
                    if (this.anc !== 0) {
                        let nextAnc = 0;

                        if (this.anc == 2){
                            nextAnc = 1;
                        }
                        else if (this.anc == 1){
                            nextAnc = 3;
                        }
                        else if (this.anc == 3){
                            nextAnc = 2;
                        }

                        if (nextAnc !==0){
                            this.backend.setAnc(this.address, nextAnc);
                        }
                    }
                }
            }
            else {
                this.key = -1;
            }
        }
    }
}