import { Backend } from "./backend";

export class Update {
    private backend: Backend;
    private timer: NodeJS.Timer;
    //private interval = 60 * 60 * 24 * 1000; // 1 day
    private interval = 10 * 1000; // 1 day
    private url = "https://magicpods.app/plugin/meta.json";
    
    public isAvailable = false;

    constructor(backend: Backend) {
        this.backend = backend;        
        this.CheckUpdate();
        this.timer = setInterval(() => this.CheckUpdate(), this.interval);
    }

    public disable(){
        clearInterval(this.timer);
    }

    private async CheckUpdate(){
        this.backend.log("Checking update");
        const enableCheckUpdateValue = (await this.backend.deckyApi.callPluginMethod("load_setting", { key: "check_update" })).result;
        if (String(enableCheckUpdateValue).toLowerCase() == "true"){
            this.isAvailable = await this.IsUpdateAvailable();
        }       
    }

    private async IsUpdateAvailable(): Promise<boolean> {
        const response = await fetch(this.url, { cache: "no-cache" });
        if (!response.ok)
            return false;

        type Meta = { version: string }
        const json = await response.json() as Meta;

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
            this.backend.log(serverVersion[i], ">", localVersion[i]);            

            if (serverVersion[i] > localVersion[i]) {
                this.backend.log("Update: available");
                return true;
            }

            if (serverVersion[i] != localVersion[i]){
                this.backend.log("Update: server has lower version");
                return false;
            }
        }

        this.backend.log("Update: Version the same");
        return false;
    }
}