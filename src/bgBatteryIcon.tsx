import { FC } from "react";
import i18next, { t } from "i18next";
import { Backend } from "./backend";
import { BatteryDataProps, headphoneInfoProps } from "./tab/tabInfo";
import { formatHeaderPercentage, installHeaderIcon, type HeaderIconController } from "./headerIcon";

const batteryColor = "#1B9EFA";
const lowBatteryColor = "#ED18BF";
const batteryIconStyle = {
    width: "28px",
    height: "16px",
    flex: "0 0 auto",
    // Steam renders its battery icon at 11/12 of the original SVG size
    transform: "scale(0.9166667)",
    transformOrigin: "center"
}

const getBatteryWidth = (battery: number) => {
    return Math.max(0, Math.min(18, battery * 0.18));
}

const isLowBattery = (battery: BatteryDataProps, threshold: number) => {
    return threshold > 0 && battery.status === 2 && !battery.charging && battery.battery !== 0 && battery.battery <= threshold;
}

const BatteryIcon: FC<{ left: number; right: number; leftLow: boolean; rightLow: boolean; }> = ({ left, right, leftLow, rightLow }) => {
    return (
        <svg style={batteryIconStyle} width="28" height="16" viewBox="0 0 28 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="3" width={getBatteryWidth(left)} height="3" fill={leftLow ? lowBatteryColor : batteryColor} />
            <rect x="4" y="10" width={getBatteryWidth(right)} height="3" fill={rightLow ? lowBatteryColor : batteryColor} />
            <path d="M26 5.33301H28V10.667H26V16H0V0H26V5.33301ZM2 8.75V14H24V8.75H2ZM2 7.25H24V2H2V7.25Z" fill="currentColor" />
        </svg>
    );
}

const SingleBatteryIcon: FC<{ battery: number; low: boolean; }> = ({ battery, low }) => {
    return (
        <svg style={batteryIconStyle} width="28" height="16" viewBox="0 0 28 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="4" width={getBatteryWidth(battery)} height="8" fill={low ? lowBatteryColor : batteryColor} />
            <path fillRule="evenodd" clipRule="evenodd" d="M26 0H0V16H26V10.6667H28V5.33333H26V0ZM24 2H2V14H24V2Z" fill="currentColor" />
        </svg>
    );
}

type BatteryIconData = { type: "single"; battery: number; low: boolean; } | { type: "leftRight"; left: number; right: number; leftLow: boolean; rightLow: boolean; } | undefined;

export class BackgroundBatteryIcon {
    private backend;
    private batteryIcon: HeaderIconController | undefined;
    private batteryIconData: BatteryIconData;
    private text = false;
    private splitBattery = true;
    private noiseControlAvailable = false;
    private disabled = false;
    // Update the tooltip when the language changes without reloading.
    private onLanguageChanged = () => {
        this.batteryIcon?.update({ ariaLabel: t("header_battery_label") });
    }

    constructor(backend: Backend) {
        this.backend = backend;
        this.initialize();
    }

    private async initialize() {
        const enabled = await this.backend.loadBooleanSetting("header_battery_icon");
        if (!enabled || this.disabled){
            this.backend.logInfo("BatteryIcon: Disabled skip mounting");
            return;
        }

        this.text = await this.backend.loadBooleanSetting("header_battery_icon_text");
        this.splitBattery = await this.backend.loadBooleanSetting("header_battery_icon_split");
        if (this.disabled)
            return;

        this.batteryIcon = installHeaderIcon({
            visible: false,
            surfaces: ["qam", "big-picture"],
            icon: <SingleBatteryIcon battery={0} low={false} />,
            ariaLabel: t("header_battery_label"),
            onActivate: () => {
                if (this.noiseControlAvailable)
                    void this.backend.bgAncSwitch.switchMode();
            },
        });
        i18next.on("languageChanged", this.onLanguageChanged);
        this.update();
    }

    public process(info: headphoneInfoProps, lowBatteryThreshold: number) {
        this.noiseControlAvailable = info.capabilities.anc != null;

        const battery = info.capabilities.battery;
        if (battery == null)
            return;

        const isLeftAvailable = battery.left.status === 2 || battery.left.status === 3;
        const isRightAvailable = battery.right.status === 2 || battery.right.status === 3;
        const isSingleAvailable = battery.single.status === 2 || battery.single.status === 3;

        if (isLeftAvailable && isRightAvailable) {
            this.setBatteryIconData({ type: "leftRight", left: battery.left.battery, right: battery.right.battery, leftLow: isLowBattery(battery.left, lowBatteryThreshold), rightLow: isLowBattery(battery.right, lowBatteryThreshold) });
        }
        else if (isLeftAvailable) {
            this.setBatteryIconData({ type: "single", battery: battery.left.battery, low: isLowBattery(battery.left, lowBatteryThreshold) });
        }
        else if (isRightAvailable) {
            this.setBatteryIconData({ type: "single", battery: battery.right.battery, low: isLowBattery(battery.right, lowBatteryThreshold) });
        }
        else if (isSingleAvailable) {
            this.setBatteryIconData({ type: "single", battery: battery.single.battery, low: isLowBattery(battery.single, lowBatteryThreshold) });
        }
        else {
            this.setBatteryIconData(undefined);
        }
    }

    public reset() {
        this.noiseControlAvailable = false;
        this.setBatteryIconData(undefined);
    }

    public updateTextSetting(enabled: boolean) {
        this.text = enabled;
        this.update();
    }

    public updateSplitBatterySetting(enabled: boolean) {
        this.splitBattery = enabled;
        this.update();
    }

    public disable() {
        this.disabled = true;
        i18next.off("languageChanged", this.onLanguageChanged);
        this.batteryIcon?.dispose();
        this.batteryIcon = undefined;
    }

    private setBatteryIconData(data: BatteryIconData) {
        if (data == null && this.batteryIconData == null)
            return;

        if (data?.type === "single" && this.batteryIconData?.type === "single" && data.battery === this.batteryIconData.battery && data.low === this.batteryIconData.low)
            return;

        if (data?.type === "leftRight" && this.batteryIconData?.type === "leftRight" && data.left === this.batteryIconData.left && data.right === this.batteryIconData.right && data.leftLow === this.batteryIconData.leftLow && data.rightLow === this.batteryIconData.rightLow)
            return;

        this.batteryIconData = data;
        this.update();
    }

    private update() {
        if (this.batteryIcon == null)
            return;

        if (this.batteryIconData == null) {
            this.batteryIcon.setVisible(false);
            return;
        }

        if (this.batteryIconData.type === "leftRight") {
            const battery = (this.batteryIconData.left + this.batteryIconData.right) / 2;
            this.batteryIcon.update({
                visible: true,
                icon: this.splitBattery ? <BatteryIcon left={this.batteryIconData.left} right={this.batteryIconData.right} leftLow={this.batteryIconData.leftLow} rightLow={this.batteryIconData.rightLow} /> : <SingleBatteryIcon battery={battery} low={this.batteryIconData.leftLow || this.batteryIconData.rightLow} />,
                text: this.text ? formatHeaderPercentage(battery) : undefined,
            });
        }
        else {
            this.batteryIcon.update({
                visible: true,
                icon: <SingleBatteryIcon battery={this.batteryIconData.battery} low={this.batteryIconData.low} />,
                text: this.text ? formatHeaderPercentage(this.batteryIconData.battery) : undefined,
            });
        }
    }
}
