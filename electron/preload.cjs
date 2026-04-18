const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('pythonia', {
  lessons: {
    list: () => ipcRenderer.invoke('lessons:list'),
    get: (slug) => ipcRenderer.invoke('lessons:get', slug),
  },
  runner: {
    run: (payload) => ipcRenderer.invoke('runner:run', payload),
  },
})
