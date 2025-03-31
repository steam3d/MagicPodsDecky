import { Router} from "@decky/ui";

export const enum Button {
    R2 = 0,
    L2 = 1,
    R1 = 2,
    L1 = 3,
    Y = 4,
    B = 5,
    X = 6,
    A = 7,
    DPAD_UP = 8,
    DPAD_RIGHT = 9,
    DPAD_LEFT = 10,
    DPAD_DOWN = 11,
    SELECT = 12,
    STEAM = 13,
    HOME = 13,
    START = 14,
    L5 = 15,
    R5 = 16,
    LEFT_TOUCHPAD_CLICK = 17,
    RIGHT_TOUCHPAD_CLICK = 18,
    LEFT_TOUCHPAD_TOUCH = 19,
    RIGHT_TOUCHPAD_TOUCH = 20,
    L3 = 22,
    R3 = 26,
    MUTE_DUALSENSE = 29,

    L4 = 9 + 32,
    R4 = 10 + 32,
    LEFT_JOYSTICK_TOUCH = 14 + 32,
    RIGHT_JOYSTICK_TOUCH = 15 + 32,
    QUICK_ACCESS_MENU = 18 + 32,
}

export class Input {

    private onButtonsPressedListeners: Array<() => void> = [];
    private keyPressingTime = Date.now();
    private shortcutPressed = false;
    private qamAndSteamDisabled = false;
    private input_register: any;
    private shortcut: Button[];
    private ignoreButtons: Button[] = [Button.LEFT_TOUCHPAD_TOUCH, Button.RIGHT_TOUCHPAD_TOUCH, Button.LEFT_JOYSTICK_TOUCH, Button.RIGHT_JOYSTICK_TOUCH] //Ignore touch

    constructor(shortcut: Button[]) {
        this.shortcut = shortcut;
        this.input_register = SteamClient.Input.RegisterForControllerStateChanges((changes: any[]) => {
            const buttons: Button[] = [];
            for (const change of changes) {
                const lower_buttons = change.ulButtons.toString(2).padStart(32, "0").split('');
                for (const [index, value] of lower_buttons.entries()) {
                    if (value === '1') {
                        buttons.push(31 - index as Button)
                        //console.log("l:", lower_buttons);
                    }
                }
                const upper_buttons = change.ulUpperButtons.toString(2).padStart(32, "0").split('');
                for (const [index, value] of upper_buttons.entries()) {
                    if (value === '1') {
                        buttons.push(63 - index as Button)
                        //console.log("u:", upper_buttons);
                    }
                }
            }
            this.OnButtonsPressed(buttons);
        });
    }

    unregister(){
        this.input_register.unregister();
    }

    private OnButtonsPressed(buttons: Button[]) {
        buttons = buttons.filter(item => !this.ignoreButtons.includes(item))

        if (this.shortcut.length === buttons.length && this.shortcut.every((value) => buttons.includes(value))) {
            if (this.shortcutPressed != true && Date.now() - this.keyPressingTime > 350) {

                if (buttons.includes(Button.QUICK_ACCESS_MENU) || buttons.includes(Button.STEAM)) {
                    (Router as any).DisableHomeAndQuickAccessButtons();
                    this.qamAndSteamDisabled = true;
                }

                this.keyPressingTime = Date.now();
                this.shortcutPressed = true;
                //console.log("Shortcut pressed");

                this.onButtonsPressedListeners.forEach(callback => {
                    callback();
                });
            }
        }
        else {
            if (this.qamAndSteamDisabled != false &&
                (!buttons.includes(Button.QUICK_ACCESS_MENU) || !buttons.includes(Button.STEAM))) {
                this.qamAndSteamDisabled = false;
                setTimeout(() => {
                    (Router as any).EnableHomeAndQuickAccessButtons();
                    //console.log("enable qam")
                }, 350);
            }
            if (this.shortcutPressed != false){
                //console.log("Shortcut released")
                this.shortcutPressed = false;
            }
        }
    }

    onShortcutPressed(callback: () => void) {
        this.onButtonsPressedListeners.push(callback);
    }

    offShortcutPressed(callback: () => void) {
        const index = this.onButtonsPressedListeners.indexOf(callback);
        if (index !== -1) {
            this.onButtonsPressedListeners.splice(index, 1);
        }
    }
}
