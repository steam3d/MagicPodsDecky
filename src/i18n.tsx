import i18n from "i18next";
import { initReactI18next } from "react-i18next";


import enUS from "./locales/en-US.json";
import ruRU from "./locales/ru-RU.json";
import zhCN from "./locales/zh-CN.json";
import frFR from "./locales/fr-FR.json";
import deDE from "./locales/de-DE.json";
import esES from "./locales/es-ES.json";
import ptBr from "./locales/pt-BR.json";
import elGr from "./locales/el-GR.json";
import koKR from "./locales/ko-KR.json";
import siLK from "./locales/si-LK.json";
import ukUA from "./locales/uk-UA.json";
import itIT from "./locales/it-IT.json";
import ptPT from "./locales/pt-PT.json";
import zhHant from "./locales/zh-Hant.json";

function initI18n(){
  i18n
  .use(initReactI18next)
  //.use(LanguageDetector)
  .init({
    detection: {
      order: ['querystring', 'navigator'],
      lookupQuerystring: 'lng',
    },
    resources: {
      "en-US": enUS,
      "ru-RU": ruRU,
      "zh-CN": zhCN,
      "fr-FR": frFR,
      "de-DE": deDE,
      "es-ES": esES,
      "pt-BR": ptBr,
      "el-GR": elGr,
      "ko-KR": koKR,
      "si-LK": siLK,
      "uk-UA": ukUA,      
      "it-IT": itIT,
      "pt-PT": ptPT,
      "zh-Hant": zhHant
    },
    //debug: true,
    lng: navigator.language,
    //lng: "zh-CN",
    fallbackLng: "en-US",
  });
}

export default initI18n;
