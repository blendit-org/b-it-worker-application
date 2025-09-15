import { app, BrowserWindow, ipcMain } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createAppWindow } from './app'
//import { fetchJob } from '../worker/jobManager'
import { HttpResponseStatus, UserInfo, WorkerInfo } from '../utils'
import { getWorkerInfo, login } from '../login/loginManager'
import os from "os"

import keytar from 'keytar'
import { loop, setCpuThreadsRuntime, stopWhenCurrentJobIsFinished } from '../worker/main'
import { checkIfBlenderAvailableLocally, downloadBlenderArchive } from '../worker/blender'
import path from 'path'

export let globalMainWindow: BrowserWindow;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')
  // Create app window
  const mainWindow = createAppWindow()
  globalMainWindow = mainWindow

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

  checkIfBlenderAvailableLocally().then( async (available: boolean) => {
    if (!available) {
      // const blenderPath = path.join(app.getPath('userData'), 'blendit', 'blender');
      // await downloadBlenderArchive(blenderPath);
      // await checkIfBlenderAvailableLocally();
      // loop(allowedCpuThreads);
    } else {
      //globalMainWindow.webContents.send('main:blender-bin-available');
      loop(allowedCpuThreads);
    }
  })
  //fetchJob().then(() => console.warn('login post request done.')) // we are golden
})

ipcMain.on('blender-badge:download-blender', async () => {
  const blenderPath = path.join(app.getPath('userData'), 'blendit', 'blender');
  await downloadBlenderArchive(blenderPath);
  await checkIfBlenderAvailableLocally();
})

ipcMain.on('home:stop-job', (_event) => {
  console.warn("[main] Stop job!");
  stopWhenCurrentJobIsFinished();
})

ipcMain.on('home:cpu-thread-change-notice', (_event, allowedCpuThreads) => {
  setCpuThreadsRuntime(allowedCpuThreads);
})

ipcMain.on('home:logout', () => {
  keytar.deletePassword("org.blendit", "auth-token");
  keytar.deletePassword("org.blendit", "auth-token-expires-in");
  globalMainWindow.reload();
})

ipcMain.handle('login:request', async (_event, userInfo: UserInfo) => {
  console.warn("Hi from [login], ", userInfo);
  const response = await login(userInfo);
  
  if (response.status === HttpResponseStatus.OK && response.data.token) {
    // save token somewhere

    keytar.setPassword("org.blendit", "auth-token", response.data.token)
    //console.warn("Date value: ",String(Date.now()) ," ",typeof(Date.now() + response.data.expiresIn));
    keytar.setPassword("org.blendit", "auth-token-expires-in", String(Date.now() + response.data.expiresIn))
    const workerInfoResponse = await getWorkerInfo(response.data.token);
    globalMainWindow.webContents.send('main:worker-information', workerInfoResponse.data.userId, workerInfoResponse.data.score); 
    globalMainWindow.reload();
    
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
  const token = await keytar.getPassword("org.blendit", "auth-token");
  if (token) {
    const workerInfoResponse = await getWorkerInfo(token);
    console.warn("get worker info... ", workerInfoResponse.data);
    globalMainWindow.webContents.send('main:worker-information', workerInfoResponse.data.userId, workerInfoResponse.data.score);
  }
  const tokenExpireDate = await keytar.getPassword("org.blendit", "auth-token-expires-in");
  if(tokenExpireDate!=null){console.warn("keytar: ",tokenExpireDate," ", parseInt(tokenExpireDate)- (Date.now()));}
  // return false;
  if (tokenExpireDate != null && parseInt(tokenExpireDate) > Date.now()) {
    return true;
  }
  return false;
})

ipcMain.handle('worker:check-blender-bin', async (_event) => {
  return await checkIfBlenderAvailableLocally();
})

ipcMain.handle('home:cpu-info', (_event) => {
  console.warn(os.cpus().length)
  const cpuInformation = {
    thread: os.cpus().length,
    info: os.cpus()[0].model,
    memInfo: Math.round(os.totalmem()/1073741824)
  }
  return cpuInformation;
})