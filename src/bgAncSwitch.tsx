import { Backend } from "./backend";
import { Button, Input } from "./input";
import { AncModes, headphoneInfoProps } from "./tab/tabInfo";

export class BackgroundAncSwitch {
    private backend;
    private selected = 0;
    private options = 0;
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
        this.enabled = await this.backend.loadBooleanSetting("anc_l5_r5_switch");
        this.backend.log("AncSwitch: Update enabled option to:", this.enabled);

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
        this.backend.log("AncSwitch: Json message received");

        const typedJson = json as { info?: headphoneInfoProps };

        if (typedJson?.info == null)
            return;

        if (Object.keys(typedJson.info).length !== 0) {
            const info = typedJson.info as headphoneInfoProps;
            if (info.capabilities?.anc != null) {
                if (this.selected !== info.capabilities.anc.selected)
                    this.selected = info.capabilities.anc.selected;

                if (this.options !== info.capabilities.anc.options)
                    this.options = info.capabilities.anc.options;

                if (this.address !== info.address)
                    this.address = info.address;

                if (this.connected !== true)
                    this.connected = true;

                this.register();
            }

        }
        else {
            this.unregister();
            this.selected = 0;
            this.options = 0;
            this.address = "";
            this.connected = false;
        }
    }

    private register() {
        if (this.enabled && this.input == null) {
            this.input = new Input([Button.QUICK_ACCESS_MENU, Button.L5]);
            this.input.onShortcutPressed(this.onShortcutPressed);
            this.backend.log("AncSwitch: Hotkey registered");
        }
    }

    private unregister() {
        if (this.input != null) {
            this.input.offShortcutPressed(this.onShortcutPressed);
            this.input.unregister();
            this.input = undefined;
            this.backend.log("AncSwitch: Hotkey unregistered");
        }
    }

    private onShortcutPressed = async () => {
        this.backend.log("AncSwitch: Hotkey pressed");

        let isOff = await this.backend.loadBooleanSetting("allow_anc_mode_off");
        let isTransparency = await this.backend.loadBooleanSetting("allow_anc_mode_transparency");
        let isAdaptive = await this.backend.loadBooleanSetting("allow_anc_mode_adaptive");
        let isWind = await this.backend.loadBooleanSetting("allow_anc_mode_wind");
        let isAnc = await this.backend.loadBooleanSetting("allow_anc_mode_anc");

        this.backend.log("AncSwitch: Options:", this.options, "Selected:", this.selected);

        let modes = [];

        if (isOff && (this.options & AncModes.OFF) != 0){
            modes.push(AncModes.OFF)
        }

        if (isTransparency && (this.options & AncModes.TRANSPARENCY) != 0) {
            modes.push(AncModes.TRANSPARENCY)
        }

        if (isAdaptive && (this.options & AncModes.ADAPTIVE) != 0) {
            modes.push(AncModes.ADAPTIVE)
        }

        if (isWind && (this.options & AncModes.WIND) != 0) {
            modes.push(AncModes.WIND)
        }

        if (isAnc && (this.options & AncModes.ANC) != 0) {
            modes.push(AncModes.ANC)
        }

        this.backend.log("AncSwitch: UI modes:", modes);

        if (modes.length <= 1)
            this.backend.log("AncSwitch: Nothing to do: fewer than two modes selected.");

        let nextAnc = modes.find(x => x > this.selected);
        if (nextAnc === undefined){
            nextAnc = modes[0];
        }

        this.backend.log("AncSwitch: Next selected mode:", nextAnc);

        if (nextAnc !== 0) {
            this.backend.setAnc(this.address, nextAnc);
        }
    }
}