import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('get-version'),
  closeApp: () => ipcRenderer.invoke('close-app'),
  platform: process.platform,
});

declare global {
  interface Window {
    electronAPI?: {
      getVersion: () => Promise<string>;
      closeApp: () => Promise<void>;
      platform: string;
    };
  }
}

