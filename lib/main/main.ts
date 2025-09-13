import { app, BrowserWindow, ipcMain } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createAppWindow } from './app'
import { fetchJob } from '../worker/jobManager'
import { HttpResponseStatus, UserInfo } from '../utils'
import { login } from '../login/loginManager'

import keytar from 'keytar'
import { loop, stopWhenCurrentJobIsFinished } from '../worker/main'

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')
  // Create app window
  createAppWindow()

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createAppWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file, you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

ipcMain.on('home:start-job', (_event, allowedCpuThreads) => {
  console.warn("Hi from renderer, [home] got message", allowedCpuThreads);
  // runBlenderForRenderingImages((_event, msg) => {console.warn(msg)})
  // .then(() => {console.warn("finished rendering")})

  loop(allowedCpuThreads);

  //fetchJob().then(() => console.warn('login post request done.')) // we are golden
})

ipcMain.on('home:stop-job', (_event) => {
  console.warn("[main] Stop job!");
  stopWhenCurrentJobIsFinished();
})

ipcMain.handle('login:request', async (_event, userInfo: UserInfo) => {
  console.warn("Hi from [login], ", userInfo);
  const response = await login(userInfo);
  if (response.status === HttpResponseStatus.OK && response.data.token) {
    // save token somewhere

    keytar.setPassword("org.blendit", "auth-token", response.data.token)
    //console.warn("Date value: ",String(Date.now()) ," ",typeof(Date.now() + response.data.expiresIn));
    keytar.setPassword("org.blendit", "auth-token-expires-in", String(Date.now() + response.data.expiresIn))

    return HttpResponseStatus.OK;
  }
  else if (response.status === HttpResponseStatus.UNAUTHORIZED) {
    return HttpResponseStatus.UNAUTHORIZED;
  }
  else if (response.status === HttpResponseStatus.BAD_REQUEST) {
    return HttpResponseStatus.BAD_REQUEST;
  }
  return HttpResponseStatus.INTERNAL_SERVER_ERROR;
})

ipcMain.handle('auth:is-token-expired', async (_event) => {
  const tokenExpireDate = await keytar.getPassword("org.blendit", "auth-token-expires-in");
  if(tokenExpireDate!=null){console.warn("keytar: ",tokenExpireDate," ", parseInt(tokenExpireDate)- (Date.now()));}
  // return false;
  if (tokenExpireDate != null && parseInt(tokenExpireDate) > Date.now()) {
    return true;
  }
  return false;
})