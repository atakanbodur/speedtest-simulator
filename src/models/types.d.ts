export interface AppSettings {
    downloadUrl: string;
    downloadUrl2: string;
    uploadUrl: string;
    pingUrl: string;
}

declare global {
    interface Window {
        appSettings: AppSettings;
    }
}

export {};