export const enum ULKeys {
    R2 = 0,
    L2 = 1,
    R1 = 2,
    L1 = 3,
    Y = 4,
    B = 5,
    X = 6,
    A = 7,
    UP = 8,
    RIGHT = 9,
    LEFT = 10,
    DOWN = 11,
    SELECT = 12,
    STEAM = 13,
    START = 14,
    L5 = 15,
    R5 = 16,

}

export enum ULUpperKeys {
    L4 = 9,
    R4 = 10,
    LSTouch = 14,
    RSTouch = 15,
    QAM = 18,
}

export function isPressed(
    buttonId: ULKeys | ULUpperKeys,
    buttons: number
) {
    return buttons && buttons & (1 << buttonId) ? true : false;
}