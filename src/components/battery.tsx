import {
    gamepadSliderClasses,
    gamepadDialogClasses,
  } from "@decky/ui";

import { FC } from 'react';

export const Battery: FC<{ title: string; battery: number; isCharging: boolean, status: number, }> = ({ title, battery, isCharging, status  }) => {
    return (
      <>
      {status !== 0 && status !== 1 &&
        <div style={{display: "flex", padding: "0px 16px 0px 0px", minWidth: "76px", opacity: status === 3 ? "0.5" : "1"}}>
                <div>
                    <svg width="16" height="28" viewBox="0 0 16 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M11 0H5V2H0V28H16V2H11V0ZM1.5 3.5H14.5V26.5H1.5V3.5Z" fill="white"/>
                        <svg x="3" y="5" width="10" height="20">
                            <rect height="100%" width="100%" fill="#59BF40" transform={"translate(0,"+(20-Math.round(battery * 0.2))+")"}></rect>
                        </svg>
                        <svg x="4.5" y="10" width="7" height="10" viewBox="0 0 7 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M0 6.25L3.5 0V3.75H7L3.5 10V6.25H0Z" fill={isCharging ? 'white' : 'transparency'}/>
                        </svg>
                    </svg>
                </div>
                <div style={{paddingLeft: "4px"}}>
                <div className={gamepadSliderClasses.SliderNotchLabel} style={{paddingTop: "0px"}}>{title}</div>
                <div className={gamepadDialogClasses.FieldLabel} style={{ fontWeight: "bold", lineHeight: "17px", paddingTop: "2px", fontSize: "20px"}}>{battery}%</div>
            </div>
        </div>}
      </>
    );
}