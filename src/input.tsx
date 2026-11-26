export const enum Button {
    A = 0,
    B = 1,
    X = 2,
    Y = 3,
    DPAD_UP = 4,
    DPAD_RIGHT = 5,
    DPAD_DOWN = 6,
    DPAD_LEFT = 7,
    MENU = 8,
    VIEW = 9,
    LEFT_TOUCHPAD_UP = 10,
    LEFT_TOUCHPAD_DOWN = 11,
    LEFT_TOUCHPAD_LEFT = 12,
    LEFT_TOUCHPAD_RIGHT = 13,
    LEFT_TOUCHPAD_ANALOG = 14,
    RIGHT_TOUCHPAD_UP = 15,
    RIGHT_TOUCHPAD_DOWN = 16,
    RIGHT_TOUCHPAD_LEFT = 17,
    RIGHT_TOUCHPAD_RIGHT = 18,
    RIGHT_TOUCHPAD_ANALOG = 19,
    LEFT_JOYSTICK_UP = 20,
    LEFT_JOYSTICK_DOWN = 21,
    LEFT_JOYSTICK_LEFT = 22,
    LEFT_JOYSTICK_RIGHT = 23,
    LEFT_JOYSTICK_ANALOG = 24,
    L3 = 25,
    L2_ANALOG = 26,
    R2_ANALOG = 27,
    L2 = 28,
    R2 = 29,
    L1 = 30,
    R1 = 31,
    L5 = 32,
    R5 = 33,
    STEAM = 34,
    SELECT = 35,
    START = 36,
    LEFT_TOUCHPAD_CLICK = 37,
    LEFT_TOUCHPAD_TOUCH = 38,
    RIGHT_TOUCHPAD_CLICK = 39,
    RIGHT_TOUCHPAD_TOUCH = 40,
    R3 = 41,
    RIGHT_JOYSTICK_TOUCH = 42,
    LEFT_JOYSTICK_TOUCH = 43,
    L4 = 44,
    R4 = 45,
    BUTTON_LAST = 46,
    ANALOG_SCROLL = 47,
    ANALOG_LEFT_KEYBOARD_CURSOR = 48,
    ANALOG_RIGHT_KEYBOARD_CURSOR = 49,
    ANALOG_LAST = 50,
}

export const enum SystemButton {
    STEAM = 0,
    QUICK_ACCESS_MENU = 1,
}

type InputRegistration = {
    unregister: () => void;
};

type SystemKeyEvent = {
    eKey: number;
    nControllerIndex: number;
};

const shortcutTimeoutMs = 1500;

export class Input {
    private readonly button: Button;
    private readonly onPressed: () => void;
    private readonly registrations: InputRegistration[] = [];
    private controllerIndex?: number;
    private timeoutId?: ReturnType<typeof setTimeout>;

    constructor(button: Button, onPressed: () => void) {
        this.button = button;
        this.onPressed = onPressed;

        if (!Input.isSupported()) return;

        // Steam only sends controller button events while its UI has focus.
        // During a game, focus must be returned by minimizing it or opening Steam/QAM.
        this.registrations.push(
            SteamClient.Input.RegisterForControllerInputMessages(
                (controllerIndex: number, rawButton: number, pressed: boolean) => {
                    if (
                        !pressed ||
                        rawButton !== this.button ||
                        controllerIndex !== this.controllerIndex
                    ) return;

                    this.reset();
                    this.onPressed();
                },
            ),
            SteamClient.System.UI.RegisterForSystemKeyEvents((event: SystemKeyEvent) => {
                if (event.eKey !== SystemButton.QUICK_ACCESS_MENU) return;

                this.reset();
                this.controllerIndex = event.nControllerIndex;
                this.timeoutId = setTimeout(() => this.reset(), shortcutTimeoutMs);
            }),
        );
    }

    unregister(): void {
        this.registrations.forEach((registration) => registration.unregister());
        this.registrations.length = 0;
        this.reset();
    }

    private reset(): void {
        if (this.timeoutId !== undefined) clearTimeout(this.timeoutId);
        this.timeoutId = undefined;
        this.controllerIndex = undefined;
    }

    static isSupported(): boolean {
        return (
            typeof SteamClient?.Input?.RegisterForControllerInputMessages === "function" &&
            typeof SteamClient?.System?.UI?.RegisterForSystemKeyEvents === "function"
        );
    }
}
