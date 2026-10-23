import {
    DialogButton,
    Navigation,
} from "@decky/ui";
import { FC } from "react";

const MAGIC_PODS_APP_ID = 4486410;

const PCIcon: FC = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden={true}
        style={{ display: "block" }}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M13 0C14.6311 9.67367e-05 15.9998 1.29276 16 2.94531V9.64844C16 11.3014 14.6318 12.5945 13.001 12.5947H10.6914L10.8721 14H11.001C11.553 14.0003 12.001 14.4479 12.001 15C12.001 15.5521 11.553 15.9997 11.001 16H5.00098C4.44869 16 4.00098 15.5523 4.00098 15C4.00098 14.4477 4.44869 14 5.00098 14H5.12598L5.30664 12.5947H3C1.36924 12.5947 2.15931e-05 11.302 0 9.64941V2.94531C0.000220587 1.29295 1.36936 0 3 0H13ZM7.14258 14H8.85547L8.6748 12.5947H7.32324L7.14258 14ZM3 2C2.42199 2 2.00023 2.44874 2 2.94531V9.64941C2.00002 10.1461 2.42185 10.5947 3 10.5947H13.001C13.5787 10.5945 14 10.1461 14 9.64844V2.94531C13.9998 2.44904 13.5789 2.00009 13 2H3Z"
            fill="currentColor"
        />
    </svg>
);

const openMagicPodsApp = () => {
    const app = window.appStore?.GetAppOverviewByAppID(MAGIC_PODS_APP_ID);

    Navigation.CloseSideMenus();

    if (app?.local_per_client_data?.installed) {
        SteamClient.Apps.RunGame(String(MAGIC_PODS_APP_ID), "", 0, 100);
    } else {
        SteamClient.Apps.ShowStore(MAGIC_PODS_APP_ID);
    }
};

export const MagicPodsAppButton: FC = () => (
    <DialogButton
        style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "40px",
            minWidth: 0,
            height: "28px",
            padding: 0,
        }}
        onOKActionDescription="Open MagicPods for Linux"
        onClick={openMagicPodsApp}
    >
        <PCIcon />
    </DialogButton>
);
