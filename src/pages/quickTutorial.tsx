import {
    staticClasses
  } from "decky-frontend-lib";
import {Trans} from 'react-i18next'
import React, { VFC } from 'react';

export const QuickTutorialRouter: VFC = () => {

    const containerStyle = {
        padding: '72px 0px 72px 0px',
        height: '100vh',
        overflow: 'auto',
    };

    const blockStyle = {
        margin: '0px 48px 32px 48px',

    };

    const headerStyle = {
        background: 'transparent',
        padding: '0px 0px 8px 0px',
        boxShadow: 'none',
    };

    const bodyStyle: React.CSSProperties = {
        textAlign: 'left',
    };

let discord = <a href="https://discord.com/invite/UyY4PY768V" target="_blank" style={{textDecoration: "none"}}/>;
    return (
        <div style={containerStyle}>
                     
            <div style={blockStyle}>
                <div className={staticClasses.Title} style={headerStyle}>
                    <Trans
                        i18nKey="faq_tip1_header"
                        /></div>                
                <div className={staticClasses.Text} style={bodyStyle}>
                    <Trans
                        i18nKey="faq_tip1_description"
                        /></div>
            </div>

            <div style={blockStyle}>
                <div className={staticClasses.Title} style={headerStyle}>
                    <Trans
                        i18nKey="faq_tip2_header"
                        /></div>                
                <div className={staticClasses.Text} style={bodyStyle}>
                    <Trans
                        i18nKey="faq_tip2_description"
                        components={{
                            lnk: discord,
                        }}/></div>
            </div>

            <div style={blockStyle}>
                <div className={staticClasses.Title} style={headerStyle}>
                    <Trans
                        i18nKey="faq_tip3_header"
                        /></div>                
                <div className={staticClasses.Text} style={bodyStyle}>
                    <Trans
                        i18nKey="faq_tip3_description"
                        /></div>
            </div>

            <div style={blockStyle}>
                <div className={staticClasses.Title} style={headerStyle}>
                    <Trans
                        i18nKey="faq_tip4_header"
                        /></div>                
                <div className={staticClasses.Text} style={bodyStyle}>
                    <Trans
                        i18nKey="faq_tip4_description"
                        /></div>
            </div>

            <div style={blockStyle}>
                <div className={staticClasses.Title} style={headerStyle}>
                    <Trans
                        i18nKey="faq_tip8_header"
                        /></div>                
                <div className={staticClasses.Text} style={bodyStyle}>
                    <Trans
                        i18nKey="faq_tip8_description"
                        /></div>
            </div>

            <div style={blockStyle}>
                <div className={staticClasses.Title} style={headerStyle}>
                    <Trans
                        i18nKey="faq_tip5_header"
                        /></div>                
                <div className={staticClasses.Text} style={bodyStyle}>
                    <Trans
                        i18nKey="faq_tip5_description"
                        /></div>
            </div>

            <div style={blockStyle}>
                <div className={staticClasses.Title} style={headerStyle}>
                    <Trans
                        i18nKey="faq_tip6_header"
                        /></div>                
                <div className={staticClasses.Text} style={bodyStyle}>
                    <Trans
                        i18nKey="faq_tip6_description"                                         
                        components={{
                            lnk: discord,
                        }}/></div>
            </div>

            <div style={blockStyle}>
                <div className={staticClasses.Title} style={headerStyle}>
                    <Trans
                        i18nKey="faq_tip7_header"
                        /></div>                
                <div className={staticClasses.Text} style={bodyStyle}>
                    <Trans
                        i18nKey="faq_tip7_description"                        
                        values={{ mail: "MagicPods@outlook.com"}}
                        components={{
                            lnk: discord,
                        }}/></div>
            </div>
                                                                                
        </div>
    );
};