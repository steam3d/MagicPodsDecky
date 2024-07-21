import i18n from "i18next";
import { initReactI18next } from "react-i18next";


import enUS from "./locales/en-US.json";
import ruRU from "./locales/ru-RU.json";
import zhCN from "./locales/zh-CN.json";
import frFR from "./locales/fr-FR.json";
import deDE from "./locales/de-DE.json";
import esES from "./locales/es-ES.json";
import ptBr from "./locales/pt-BR.json";

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
    },
    //debug: true,
    lng: navigator.language,
    //lng: "zh-CN",
    fallbackLng: "en-US",
  });
