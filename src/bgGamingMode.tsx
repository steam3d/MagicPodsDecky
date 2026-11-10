import { Backend } from "./backend";
import { headphoneInfoProps } from "./tab/tabInfo";

// Feeds the autoSwitch capability's runtime focusLockActive flag from this host's gaming
// session: the SteamUIStore session list is the same state the Quick Access menu uses to
// offer "return to the running game", and any app launched through Steam counts. The
// core's policy only consumes the flag; deciding when to arm the lock lives here.
export class BackgroundGamingMode {
    private backend: Backend;
    private pollTimer: ReturnType<typeof setInterval>;
    private gameRunning = false;
    // The last device info seen on the socket pump; a send needs its address and preference.
    private lastInfo: { address: string, focusLock: boolean, focusLockActive: boolean } | undefined;
    private lastSent: { address: string, value: boolean, at: number } | undefined;

    constructor(backend: Backend) {
        this.backend = backend;
        this.gameRunning = this.isGameRunning();
        this.pollTimer = setInterval(() => this.onPoll(), 2000);
    }

    public process(info: headphoneInfoProps) {
        const autoSwitch = info.capabilities.autoSwitch;
        if (!autoSwitch) {
            this.lastInfo = undefined;
            return;
        }
        this.lastInfo = {
            address: info.address,
            focusLock: autoSwitch.selected.focusLock,
            focusLockActive: autoSwitch.selected.focusLockActive,
        };
        this.reconcile();
    }

    public reset() {
        this.lastInfo = undefined;
        this.lastSent = undefined;
    }

    public disable() {
        clearInterval(this.pollTimer);
        this.lastInfo = undefined;
        this.lastSent = undefined;
    }

    private onPoll() {
        const running = this.isGameRunning();
        if (running === this.gameRunning)
            return;
        this.gameRunning = running;
        this.reconcile();
    }

    // Push whenever the core's reported state disagrees with what the host's session implies.
    // The core echoes every accepted write through the socket pump, so a genuine change
    // clears this via process(); the timed guard only suppresses duplicates while an echo
    // is still in flight, and lets the state resync after a core restart resets the flag.
    private reconcile() {
        const info = this.lastInfo;
        if (!info)
            return;
        const desired = this.gameRunning && info.focusLock;
        if (desired === info.focusLockActive) {
            this.lastSent = undefined;
            return;
        }
        if (this.lastSent && this.lastSent.address === info.address &&
            this.lastSent.value === desired && Date.now() - this.lastSent.at < 5000)
            return;
        this.lastSent = { address: info.address, value: desired, at: Date.now() };
        this.backend.setCapability("autoSwitch", info.address, { focusLockActive: desired });
    }

    private isGameRunning(): boolean {
        try {
            const appId = SteamUIStore?.MainRunningAppID;
            return appId != null && appId > 0;
        } catch {
            return false;
        }
    }
}
