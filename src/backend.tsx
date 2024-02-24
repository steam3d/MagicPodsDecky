import {
    ServerAPI,
  } from "decky-frontend-lib";
import { Controller } from "./controller";

export const enum BackendSocketState {
    UNINSTANTIATED = -2,
    ERROR = -1,
    CONNECTING = 0,
    OPEN = 1,
    CLOSED = 3
}

export class Backend {
    static readonly maxAttempts = 10;

    deckyApi: ServerAPI;
    controller: Controller;
    private socket!: WebSocket;
    private socketState = BackendSocketState.UNINSTANTIATED;

    private jsonMessageReceivedListeners: Array<(json: object) => void> = [];
    private socketConnectionChangedListeners: Array<(state: BackendSocketState) => void> = [];

    private allowReconnect = false;
    private reconnectAttempts!: number;
    private reconnectTimeoutId: NodeJS.Timeout | undefined;


    onOpenHandler = (event: Event) => {
        this.reconnectAttempts = Backend.maxAttempts
        this.log(`Socket opened (${this.convert(this.socket.readyState)})`, event);
        this.notifySocketConnectionChanged(BackendSocketState.OPEN)
    };

    onMessageHandler = (event: MessageEvent) => {
        this.log('Message received:', event.data);
        this.notifyJsonMessageReceivedListeners(event.data);
    };

    onCloseHandler = async (event: CloseEvent) => {
        this.log(`Socket closed (${this.convert(this.socket.readyState)})`, event);

        if (!this.allowReconnect){
            this.log("Reconnecting is prohibited")
                this.notifySocketConnectionChanged(BackendSocketState.CLOSED)
                return;
        }

        if (this.reconnectAttempts !== 0){
            const isBackendAllowed = (await this.deckyApi.callPluginMethod("backend_allowed", {})).result as boolean
            if (!isBackendAllowed){ // When user delete the plugin, we do not want to reconnect socket.
                this.log("Running backend is prohibited by python")
                this.notifySocketConnectionChanged(BackendSocketState.CLOSED)
                return;
            }

            if (this.reconnectTimeoutId)
                clearTimeout(this.reconnectTimeoutId);

            this.log("Trying start bucked due socket closed");
            await this.deckyApi.callPluginMethod("start_backed", {})

            this.reconnectTimeoutId = setTimeout(async () => {
                this.notifySocketConnectionChanged(BackendSocketState.CONNECTING)
                this.reconnectAttempts -= 1;
                this.log(`Trying reconnecting socket due socket closed. Left attempts ${this.reconnectAttempts} `);
                this.socketConnect();
                }, 1000)
        }
        else{
            this.notifySocketConnectionChanged(BackendSocketState.ERROR)
        }
    };

    onErrorHandler = (error: Event) => {
        this.log(`Socket error (${this.convert(this.socket.readyState)})`, error);
    };

    constructor(deckyApi: ServerAPI) {
        this.deckyApi = deckyApi;
        this.controller = new Controller(this);
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
        console.log(message);
        await this.deckyApi.callPluginMethod("logger_react", { msg: message });
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
            this.log("removeEventListener from socket");
            this.socket.removeEventListener("open", this.onOpenHandler);
            this.socket.removeEventListener("message", this.onMessageHandler);
            this.socket.removeEventListener("close", this.onCloseHandler);
            this.socket.removeEventListener("error", this.onErrorHandler);
        }
        this.log("trying connect socket");
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
                this.log('Socket disconnected');
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
        this.log("socketState changed to", this.convert(state))
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
            this.log("Sending:", str)
            this.socket.send(str);
        }
        else{
            this.log(`Failed (readyState: ${this.socket.readyState}, socketState: ${this.socketState}) to send: ${str}`);
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
        const json = {
            method: "SetAnc",
            arguments: {
                address: address,
                value: value
            }
        }
        this.sendToSocket(JSON.stringify(json))
    }
}
