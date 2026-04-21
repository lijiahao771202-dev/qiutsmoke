const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    generateTTS: (payload) => ipcRenderer.invoke('generate-tts', payload),
    generateMeditation: (payload) => ipcRenderer.send('generate-meditation', payload),
    onMeditationChunk: (callback) => ipcRenderer.on('meditation-chunk', (_, data) => callback(data)),
    onMeditationError: (callback) => ipcRenderer.on('meditation-error', (_, error) => callback(error)),
    onMeditationDone: (callback) => ipcRenderer.on('meditation-done', () => callback()),
    removeMeditationListeners: () => {
        ipcRenderer.removeAllListeners('meditation-chunk');
        ipcRenderer.removeAllListeners('meditation-error');
        ipcRenderer.removeAllListeners('meditation-done');
    }
});
