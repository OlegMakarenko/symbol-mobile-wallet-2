import { I18n } from 'i18n-js';
import { memoize } from 'lodash';
import { PersistentStorage } from 'src/storage';

const DEFAULT_LANGUAGE_CODE = 'en';

const i18n = new I18n();

const translationGetters = {
    en: () => require('./locales/en.json'),
    // uk: () => require('./locales/uk.json'),
    // Require new languages here
};

const languageNames = {
    en: 'English',
    // uk: 'Українська',
    // Add names for new languages here
};

const translate = memoize(
    (key, config) => i18n.t(key, config),
    (key, config) => (config ? key + JSON.stringify(config) : key)
);

const updateConfig = (languageCode) => {
    let updatedLanguageCode = DEFAULT_LANGUAGE_CODE;

    if (languageCode && translationGetters.hasOwnProperty(languageCode)) {
        updatedLanguageCode = languageCode;
    }

    translate.cache.clear();
    i18n.translations = {
        [updatedLanguageCode]: translationGetters[updatedLanguageCode](),
        [DEFAULT_LANGUAGE_CODE]: translationGetters[DEFAULT_LANGUAGE_CODE](),
    };
    i18n.defaultLocale = DEFAULT_LANGUAGE_CODE;
    i18n.locale = updatedLanguageCode;
    i18n.fallbacks = true;
};

export const initLocalization = async () => {
    const languageCode = await getCurrentLanguage();
    updateConfig(languageCode);
};

export const getCurrentLanguage = async () => {
    return PersistentStorage.getSelectedLanguage();
};

export const setCurrentLanguage = async (languageCode) => {
    updateConfig(languageCode);
    await PersistentStorage.setSelectedLanguage(languageCode);
};

export const getLanguages = () => {
    return {
        ...languageNames,
    };
};

export const $t = translate;
