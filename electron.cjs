/**
 * ResoScan — Electron main process.
 *
 * Loads the Vite-built app from the dist/ folder.
 * Grants microphone permission automatically so the user
 * doesn't have to deal with Electron-specific permission prompts.
 */

const { app, BrowserWindow, session } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 900,
    title: 'ResoScan',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Load the built app (index.html from dist/)
  win.loadFile(path.join(__dirname, 'dist', 'index.html'))
}

// Grant microphone permission without prompting
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      const allowed = ['media', 'mediaKeySystem', 'audioCapture']
      callback(allowed.includes(permission))
    },
  )

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
