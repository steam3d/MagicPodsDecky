import { call } from "@decky/api";
import { Backend } from "./backend";
import { headphoneInfoProps } from "./tab/tabInfo";

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
        this.enabled = await this.backend.loadBooleanSetting("fix_disconnects");
        this.backend.log("Player: Update enabled option to:", this.enabled);

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
        this.backend.log("Player: Json message received");

        const typedJson = json as { info?: headphoneInfoProps };
        if (typedJson?.info == null)
            return;

        if (Object.keys(typedJson.info).length !== 0) {
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
            await call<[], void>("play");
            this.backend.log("Player: started");
        }
    }

    private async unregister() {
        await call<[], void>("stop");
        this.backend.log("Player: stopped");
    }
}
