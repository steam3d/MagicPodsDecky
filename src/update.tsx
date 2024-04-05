import { t } from "i18next";
import { Backend } from "./backend";
import { LogoIcon } from "./icons";

export class Update {
    private updateReceivedListeners: Array<(isUpdateAvailable: boolean) => void> = [];
    private backend: Backend;
    private url = "https://magicpods.app/plugin/meta.json";

    private _isAvailable = false;
    get isAvailable(): boolean {
        return this._isAvailable;
    }

    constructor(backend: Backend) {
        this.backend = backend;
        this.CheckUpdate(true);
    }

    onUpdateMessageReceived(callback: (isUpdateAvailable: boolean) => void) {
        this.updateReceivedListeners.push(callback);
    }

    offUpdateMessageReceived(callback: (isUpdateAvailable: boolean) => void) {
        const index = this.updateReceivedListeners.indexOf(callback);
        if (index !== -1) {
            this.updateReceivedListeners.splice(index, 1);
        }
    }

    private notifyUpdateMessageReceivedListeners(isUpdateAvailable: boolean) {
        this.updateReceivedListeners.forEach(callback => {
            callback(isUpdateAvailable);
        });
    }

    public async CheckUpdate(showNotification = false): Promise<void> {
        this.backend.log("Checking update");
        const enableCheckUpdateValue = (await this.backend.deckyApi.callPluginMethod("load_setting", { key: "check_update" })).result;
        if (String(enableCheckUpdateValue).toLowerCase() == "true") {
            this._isAvailable = await this.IsUpdateAvailable();

            if (this._isAvailable && showNotification) {
                this.backend.log("Showing update available notification");
                this.backend.deckyApi.toaster.toast({
                    icon: <LogoIcon />,
                    title: "MagicPods",
                    body: t("notif_update_available")
                });
            }
        }
        else {
            this._isAvailable = false; //Hide notification if use do not want to see updates
        }
        this.notifyUpdateMessageReceivedListeners(this.isAvailable);
    }

    private async IsUpdateAvailable(): Promise<boolean> {
        type Meta = { version: string }

        // Danger. Fetch does not cache right now, but behavior can be changed by Decky update
        const response = await this.backend.deckyApi.fetchNoCors(this.url, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
        });

        if (!response.success || Number((response.result as any).status) != 200)
            return false;

        const json: Meta = JSON.parse((response.result as any).body);

        // No 'Access-Control-Allow-Origin' header is present on the requested resource.
        // We must add header 'Access-Control-Allow-Origin' '*' on server
        // const response = await fetch(this.url, { cache: "no-cache" });

        // if (!response.ok)
        //     return false;

        // const json = await response.json() as Meta;

        if (json.version == null)
            return false;

        const result = (await this.backend.deckyApi.callPluginMethod("get_ver", {}));

        if (!result.success)
            return false;

        const version = result.result.toString();

        //JS Number convert empty string to 0, thus "1.0." -> [1,0,0] 
        const serverVersion = json.version.split(".").map(Number);
        const localVersion = version.split(".").map(Number);

        if (serverVersion.length != 3 || localVersion.length != 3)
            return false;

        this.backend.log(`Server ver: ${json.version} | Local ver: ${version}`);

        for (let i = 0; i < 3; i += 1) {
            //this.backend.log(serverVersion[i], ">", localVersion[i]);

            if (serverVersion[i] > localVersion[i]) {
                this.backend.log("Update: available");
                return true;
            }

            if (serverVersion[i] != localVersion[i]) {
                this.backend.log("Update: server has lower version");
                return false;
            }
        }

        this.backend.log("Update: Version the same");
        return false;
    }
}