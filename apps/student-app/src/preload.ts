import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('get-version'),
  platform: process.platform,
});

declare global {
  interface Window {
    electronAPI: {
      getVersion: () => Promise<string>;
      platform: string;
    };
  }
}
