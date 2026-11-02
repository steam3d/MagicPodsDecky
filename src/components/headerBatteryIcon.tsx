import { findClassModule, findModuleExport, IconsModule } from "@decky/ui";
import type { ComponentType, ReactNode, SVGProps } from "react";

type BatteryReading = {
    battery: number;
    low: boolean;
    charging: boolean;
};

type NativeBatteryProps = {
    acState: number;
    batteryLevel: number;
    batteryCriticalThreshold: number;
    className: string;
};

type ControllerBatteryClasses = {
    ControllerBatteryImgContainer: string;
    ControllerBatteryIndicator: string;
    ControllerImg: string;
};

type NativeComponents = {
    Headphones: ComponentType<SVGProps<SVGSVGElement>>;
    Battery: ComponentType<NativeBatteryProps>;
    classes: ControllerBatteryClasses;
};

type HeaderBatteryIconProps = {
    readings: readonly [BatteryReading] | readonly [BatteryReading, BatteryReading];
    fallback: ReactNode;
};

let nativeComponents: NativeComponents | null | undefined;

const resolveNativeComponents = (): NativeComponents | null => {
    if (nativeComponents !== undefined)
        return nativeComponents;

    try {
        const Headphones = IconsModule?.Headphones;
        const Battery = findModuleExport((candidate) => {
            if (typeof candidate !== "function")
                return false;

            const source = Function.prototype.toString.call(candidate);
            return source.includes("batteryCriticalThreshold") && source.includes("forceWhiteChargingBolt");
        });
        const classes = findClassModule((candidate) =>
            typeof candidate?.ControllerBatteryImgContainer === "string" &&
            typeof candidate?.ControllerBatteryIndicator === "string" &&
            typeof candidate?.ControllerImg === "string"
        );

        if (typeof Headphones === "function" && typeof Battery === "function" && classes) {
            nativeComponents = { Headphones, Battery, classes: classes as ControllerBatteryClasses };
            return nativeComponents;
        }
    }
    catch {
        // Steam may change its internal exports between client updates.
    }

    nativeComponents = null;
    console.warn("MagicPods: Native header battery components are unavailable; using the existing battery icon.");
    return nativeComponents;
};

const normalizeBatteryLevel = (battery: number): number => {
    return Number.isFinite(battery) ? Math.max(0, Math.min(100, battery)) / 100 : 0;
};

// Native Battery applies style props to its SVG, so size its outer wrapper here.
const batteryStyles = `
[data-magicpods-header-battery-icon] .magicpods-header-battery-indicator {
    width: 20px;
    min-width: unset;
}
[data-magicpods-header-battery-icon] .magicpods-header-battery-indicator-right {
    left: 19.5px;
}

[data-magicpods-header-battery-icon] .magicpods-header-battery-indicator-charging > svg > g > path:last-child {
    transform-box: fill-box;
    transform-origin: center;
    rotate: 90deg;
}
`;

export const HeaderBatteryIcon = ({ readings, fallback }: HeaderBatteryIconProps) => {
    const native = resolveNativeComponents();
    if (native === null)
        return <>{fallback}</>;

    const { Headphones, Battery, classes } = native;
    return (
        <span
            data-magicpods-header-battery-icon
            className={classes.ControllerBatteryImgContainer}
            style={readings.length === 2 ? { width: "34px" } : undefined}
        >
            <style>{batteryStyles}</style>
            <Headphones className={classes.ControllerImg} style={{ width: "22px", height: "24px", display: "block" }} />
            {readings.map((reading, index) => (
                <Battery
                    key={index}
                    className={`${classes.ControllerBatteryIndicator} magicpods-header-battery-indicator${index === 1 ? " magicpods-header-battery-indicator-right" : ""}`}
                    acState={reading.charging ? 2 : 1}
                    batteryLevel={normalizeBatteryLevel(reading.battery)}
                    batteryCriticalThreshold={reading.low ? 1 : -1}
                />
            ))}
        </span>
    );
};
