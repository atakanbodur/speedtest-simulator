import { AppSettings } from './models/types';

export const create = (): AppSettings => {
    // apiServerOverride default is true
    if (!window.appSettings?.downloadUrl && window.appSettings) {
        window.appSettings.downloadUrl = window.location.origin + '/api/speedtest/download';
    }
    return window.appSettings;
};

export const instance = {
    create,
};

export default instance;
