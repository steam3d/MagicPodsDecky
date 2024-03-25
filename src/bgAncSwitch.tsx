import { Backend } from "./backend";
import { Button, Input } from "./input";
import { headphoneInfoProps } from "./tab/tabInfo";

export class BackgroundAncSwitch {
    private backend;
    private anc = 0;
    private address = "";
    private enabled = false;
    private connected = false;
    private input: Input | undefined;


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
            if (this.enabled) {
                this.register();
            }
            else {
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
        if (this.enabled && this.input == null) {
            this.input = new Input([Button.QUICK_ACCESS_MENU, Button.L5]);
            this.input.onShortcutPressed(this.onShortcutPressed);
            this.backend.log("Hotkey registered")
        }
    }

    private unregister() {
        if (this.input != null) {
            this.input.offShortcutPressed(this.onShortcutPressed);
            this.input.unregister();
            this.input = undefined;
            this.backend.log("Hotkey unregistered")
        }
    }

    private onShortcutPressed = () => {
        this.backend.log("Hotkey pressed")
        if (this.anc !== 0) {
            let nextAnc = 0;

            if (this.anc == 2) {
                nextAnc = 1;
            }
            else if (this.anc == 1) {
                nextAnc = 3;
            }
            else if (this.anc == 3) {
                nextAnc = 2;
            }

            if (nextAnc !== 0) {
                this.backend.setAnc(this.address, nextAnc);
            }
        }
    }
}