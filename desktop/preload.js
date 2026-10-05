'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopBridge', {
  exportFile: payload => ipcRenderer.invoke('desktop:export-file', payload),
  importFile: payload => ipcRenderer.invoke('desktop:import-file', payload),
  onMenu: cb => {
    ipcRenderer.removeAllListeners('desktop:menu');
    ipcRenderer.on('desktop:menu', (event, action) => cb(action));
  },
});
