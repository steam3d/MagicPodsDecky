import { Backend } from "./backend";
import { Button, Input } from "./input";
import { headphoneInfoProps } from "./tab/tabInfo";

const AncMode = {
    OFF: 1,
    TRANSPARENCY: 2,
    ADAPTIVE: 4,
    WIND: 8,
    ANC: 16,
  };  

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
        this.backend.log("Process switch anc hotkey message");    

        if (!json.hasOwnProperty("info"))
            return;

        if (Object.keys(json["info"]).length !== 0) {
            const info = json["info"] as headphoneInfoProps;
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

    private onShortcutPressed = async () => {
        this.backend.log("Hotkey pressed")

        let isOff = await this.backend.loadBooleanSetting("allow_anc_mode_off");
        let isTransparency = await this.backend.loadBooleanSetting("allow_anc_mode_transparency");
        let isAdaptive = await this.backend.loadBooleanSetting("allow_anc_mode_adaptive");
        let isWind = await this.backend.loadBooleanSetting("allow_anc_mode_wind");
        let isAnc = await this.backend.loadBooleanSetting("allow_anc_mode_anc");

        this.backend.log("Options: ", this.options);
        this.backend.log("Selected: ", this.selected);


        let modes = [];

        if (isOff && (this.options & AncMode.OFF) != 0){
            modes.push(AncMode.OFF)
        }

        if (isTransparency && (this.options & AncMode.TRANSPARENCY) != 0) {
            modes.push(AncMode.TRANSPARENCY)
        }

        if (isAdaptive && (this.options & AncMode.ADAPTIVE) != 0) {
            modes.push(AncMode.ADAPTIVE)
        }

        if (isWind && (this.options & AncMode.WIND) != 0) {
            modes.push(AncMode.WIND)
        }

        if (isAnc && (this.options & AncMode.ANC) != 0) {
            modes.push(AncMode.ANC)
        }

        this.backend.log(modes);

        if (modes.length <= 1)
            this.backend.log("Nothing to do: fewer than two modes selected.");

        let nextAnc = modes.find(x => x > this.selected);
        if (nextAnc === undefined){
            nextAnc = modes[0];
        }

        this.backend.log(nextAnc);
        
        if (nextAnc !== 0) {
            this.backend.setAnc(this.address, nextAnc);
        }
    }
}