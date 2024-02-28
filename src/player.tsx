import { Backend } from "./backend";

export class Player {
    private backend;
    private enabled = false;
    private connected = false;


    constructor(backend: Backend) {
        this.backend = backend;
        this.backend.onJsonMessageReceived(this.onJsonMessageReceived);
        this.updateSetting();
    }

    async updateSetting() {
        const enableFixDisconnectingValue = (await this.backend.deckyApi.callPluginMethod("load_setting", { key: "fix_disconnects" })).result;
        this.enabled = (String(enableFixDisconnectingValue).toLowerCase() == "true");
        this.backend.log(`Update player setting to: ${this.enabled}`)

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
        this.backend.log("Process player message");

        if (!json.hasOwnProperty("info"))
        return;

        if (Object.keys(json["info"]).length !== 0) {            
                if (this.connected !== true){
                    this.connected = true;
                    this.register();
                }
        }
        else {
            if (this.connected !== false){
                this.connected = false;
                this.unregister();
            }
        }
    }

    private async register() {
        if (this.enabled) {
            await this.backend.deckyApi.callPluginMethod("play", {})
            this.backend.log("Player started")
        }
    }

    private async unregister() {
            await this.backend.deckyApi.callPluginMethod("stop", {})
            this.backend.log("Player stopped")
    }
}
