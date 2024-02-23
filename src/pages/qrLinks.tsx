import React, { VFC } from 'react';

import boostylogo from "../../assets/boosty-logo.png";
import discordlogo from "../../assets/discord-logo.png";
import magicpodslogo from "../../assets/magicpods-logo.png";

import boostyqr from "../../assets/boosty-qrcode.png";
import discordqr from "../../assets/discord-qrcode.png";
import magicpodsqr from "../../assets/magicpods-qrcode.png";

export const QrLinksRouter: VFC = () => {

    const containerStyle = {        
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        margin: 0,
    };

    const blockStyle: React.CSSProperties = {
        textAlign: 'center',
        margin: '0 44px',
    };

    const imgStyle = {
        width: '164px',
        height: '164px',
        marginBottom: '8px',
    };

    const iconStyle = {
        width: '16px',
        height: '16px',
        marginRight: '8px',
    };

    const container = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    }


    return (
        <div style={containerStyle}>
            <div style={blockStyle}>
                <img src={discordqr} alt="Qr code to discord" style={imgStyle} />
                <div style={container}>
                    <img src={discordlogo} alt="Discord logo" style={iconStyle} />
                    <div>Discord</div>
                </div>
            </div>
            <div style={blockStyle}>
                <img src={magicpodsqr} alt="Qr code to magicpods" style={imgStyle} />
                <div style={container}>
                    <img src={magicpodslogo} alt="MagicPods logo" style={iconStyle} />
                    <div>MagicPods</div>
                </div>
            </div>
            <div style={blockStyle}>
                <img src={boostyqr} alt="Qr code to discord to boosty" style={imgStyle} />
                <div style={container}>
                    <img src={boostylogo} alt="Boosty logo" style={iconStyle} />
                    <div>Boosty</div>
                </div>
            </div>
        </div>
    );
};