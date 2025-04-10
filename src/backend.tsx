import {
    call
  } from "@decky/api";
import { BackgroundAncSwitch } from "./bgAncSwitch";
import { Player } from "./player";

export const enum BackendSocketState {
    UNINSTANTIATED = -2,
    ERROR = -1,
    CONNECTING = 0,
    OPEN = 1,
    CLOSED = 3
}

export class Backend {
    static readonly maxAttempts = 10;

    bgAncSwitch: BackgroundAncSwitch;
    player: Player;
    private socket!: WebSocket;
    private socketState = BackendSocketState.UNINSTANTIATED;

    private jsonMessageReceivedListeners: Array<(json: object) => void> = [];
    private socketConnectionChangedListeners: Array<(state: BackendSocketState) => void> = [];

    private allowReconnect = false;
    private reconnectAttempts!: number;
    private reconnectTimeoutId: NodeJS.Timeout | undefined;


    onOpenHandler = (event: Event) => {
        this.reconnectAttempts = Backend.maxAttempts
        this.log("Backend: Socket opened (", this.convert(this.socket.readyState), ")", event);
        this.notifySocketConnectionChanged(BackendSocketState.OPEN)
    };

    onMessageHandler = (event: MessageEvent) => {
        this.log("Backend: Message received:", event.data);
        this.notifyJsonMessageReceivedListeners(event.data);
    };

    onCloseHandler = async (event: CloseEvent) => {
        this.log("Backend: Socket closed (", this.convert(this.socket.readyState), ")", event);

        if (!this.allowReconnect){
            this.log("Backend: Reconnecting is prohibited");
                this.notifySocketConnectionChanged(BackendSocketState.CLOSED)
                return;
        }

        if (this.reconnectAttempts !== 0){
            const isBackendAllowed = await call<[], boolean>("backend_allowed");
            if (!isBackendAllowed){ // When user delete the plugin, we do not want to reconnect socket.
                this.log("Backend: Running backend is prohibited by python");
                this.notifySocketConnectionChanged(BackendSocketState.CLOSED)
                return;
            }

            if (this.reconnectTimeoutId)
                clearTimeout(this.reconnectTimeoutId);

            this.log("Backend: Trying start bucked due socket closed");
            await call("start_backed");

            this.reconnectTimeoutId = setTimeout(async () => {
                this.notifySocketConnectionChanged(BackendSocketState.CONNECTING)
                this.reconnectAttempts -= 1;
                this.log("Backend: Trying reconnecting socket due socket closed. Left attempts", this.reconnectAttempts);
                this.socketConnect();
                }, 1000)
        }
        else{
            this.notifySocketConnectionChanged(BackendSocketState.ERROR)
        }
    };

    onErrorHandler = (error: Event) => {
        this.log("Backend: Socket error (", this.convert(this.socket.readyState), ")", error);
    };

    constructor() {
        this.bgAncSwitch = new BackgroundAncSwitch(this);
        this.player = new Player(this);
        this.connect();
    }

    async log (...args: any[]) {
        var message = "";
        for (var i = 0; i < args.length; ++i) {
          if (typeof args[i] == 'object') {
            message += (JSON && JSON.stringify ? JSON.stringify(args[i]) : String(args[i]))
          }
          else {
            message += String(args[i])
          }
          message += " "
        }
        message = message.trim();
        //console.log(message);
        await call<[msg: string], void>("logger_react", message);
      }

    //settings
    private async loadSetting<T = string>(key: string): Promise<T | null> {
        try {
            const response = await call<[key: string], T>("load_setting", key);
            return response;
        } catch (e) {
            this.log("Backend: Exception while loading setting:", key, e);
            return null;
        }
    }

    async loadBooleanSetting(key: string): Promise<boolean> {
        const value = await this.loadSetting<string>(key);
        return String(value).toLowerCase() === "true";
      }

    public async loadNumberSetting(key: string): Promise<number | null> {
        const value = await this.loadSetting<string | number>(key);
        const parsed = Number(value);
        if (isNaN(parsed)) {
          this.log("Backend: Invalid number in setting:", key, value);
          return null;
        }
        return parsed;
    }

    async saveSetting(key: string, value: any): Promise<boolean> {
        try {
            const response = await call<[key:string, value: any], boolean>("save_setting", key, value);
            return response;
        } catch (e) {
            this.log("Backend: Exception while saving setting:", key, e);
            return false;
        }
    }

    getSocketState() {
        return this.socketState;
    }

    connect(){
        this.allowReconnect = true;
        this.reconnectAttempts = Backend.maxAttempts
        this.socketConnect();
    }

    disconnect(){
        this.allowReconnect = false;
        this.socketDisconnect();
    }

    private socketConnect() {
        this.socketDisconnect();
        if (this.socket){
            this.log("Backend: RemoveEventListener from socket");
            this.socket.removeEventListener("open", this.onOpenHandler);
            this.socket.removeEventListener("message", this.onMessageHandler);
            this.socket.removeEventListener("close", this.onCloseHandler);
            this.socket.removeEventListener("error", this.onErrorHandler);
        }
        this.log("Backend: Trying connect socket");
        this.socket = new WebSocket("ws://localhost:2020");
        this.socket.addEventListener("open", this.onOpenHandler);
        this.socket.addEventListener("message", this.onMessageHandler);
        this.socket.addEventListener("close", this.onCloseHandler);
        this.socket.addEventListener("error", this.onErrorHandler);
    }

    private socketDisconnect() {
        if (this.socket) {
            if(this.socket.readyState == 1){ //open
                this.socket.close();
                this.log('Backend: Socket disconnected');
            }
        }
    }

    onJsonMessageReceived(callback: (json: object) => void) {
        this.jsonMessageReceivedListeners.push(callback);
    }

    offJsonMessageReceived(callback: (json: object) => void) {
        const index = this.jsonMessageReceivedListeners.indexOf(callback);
        if (index !== -1) {
            this.jsonMessageReceivedListeners.splice(index, 1);
        }
    }

    private notifyJsonMessageReceivedListeners(data: any) {
        if (!this.isJsonString(data as string)) {
            return
        }

        const json = JSON.parse(data);
        this.jsonMessageReceivedListeners.forEach(callback => {
            callback(json);
        });
    }

    onSocketConnectionChanged(callback: (state: BackendSocketState) => void) {
        this.socketConnectionChangedListeners.push(callback);
    }

    offSocketConnectionChanged(callback: (state: BackendSocketState) => void) {
        const index = this.socketConnectionChangedListeners.indexOf(callback);
        if (index !== -1) {
            this.socketConnectionChangedListeners.splice(index, 1);
        }
    }

    private notifySocketConnectionChanged(state: BackendSocketState) {
        if (this.socketState === state) {
            return;
        }
        this.log("Backend: SocketState changed to", this.convert(state));
        this.socketState = state;
        this.socketConnectionChangedListeners.forEach(callback => {
            callback(this.socketState);
        });
    }

    private isJsonString(str: string) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }

    private convert(n: number){
        switch(n){
            case -1:
                return "error";
            case 0:
                return "connecting";
            case 1:
                return "open";
            case 2:
                return "closing";
            case 3:
                return "closed";
            default:
                return "unknown";

        }
    }

    sendToSocket(str: string) {
        if (this.socket.readyState == 1) {//open
            this.log("Backend: Sending:", str);
            this.socket.send(str);
        }
        else{
            this.log("Backend: Failed (readyState:", this.socket.readyState, "socketState:", this.socketState, ") to send:", str);
        }
    }

    // Methods

    getAll() {
        const json = {
            method: "GetAll"
        }
        this.sendToSocket(JSON.stringify(json))
    }

    getInfo() {
        const json = {
            method: "GetDeckyInfo"
        }
        this.sendToSocket(JSON.stringify(json))
    }

    getDevices() {
        const json = {
            method: "GetDevices"
        }

        this.sendToSocket(JSON.stringify(json))
    }

    getDefaultBluetoothAdapter() {
        const json = {
            method: "GetDefaultBluetoothAdapter"
        }
        this.sendToSocket(JSON.stringify(json))
    }

    connectDevice(address: string) {
        const json = {
            method: "ConnectDevice",
            arguments: {
                address: address
            }
        }
        this.sendToSocket(JSON.stringify(json))
    }

    disconnectDevice(address: string) {
        const json = {
            method: "DisconnectDevice",
            arguments: {
                address: address
            }
        }
        this.sendToSocket(JSON.stringify(json))
    }

    enableDefaultBluetoothAdapter() {
        const json = {
            method: "EnableDefaultBluetoothAdapter"
        }
        this.sendToSocket(JSON.stringify(json))
    }

    disableDefaultBluetoothAdapter() {
        const json = {
            method: "DisableDefaultBluetoothAdapter"
        }
        this.sendToSocket(JSON.stringify(json))
    }


    setAnc(address: string, value: number) {
        const json =
        {
            method: "SetCapabilities",
            arguments: {
              address: address,
              "capabilities": {
                "anc": {
                  "selected": value
                }
              }
            }
          }
        this.sendToSocket(JSON.stringify(json))
    }
}
