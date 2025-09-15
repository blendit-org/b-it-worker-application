import { execFile, spawn } from "child_process";
import path from "path";
import { blenderLinuxDownloadUrl, blenderWinDownloadUrl, Job, Settings } from "../utils";
import fs from "fs"
import { app } from "electron";
import { promisify } from "util";
import axios from "axios";
import extract from "extract-zip";
import * as tar from "tar";
import { globalMainWindow } from "../main/main";

export async function runBlenderForRenderingImages(
    job: Job,
    settings: Settings,
    onProgress: (p: any) => void) {
    
    // Output directory of rendered image
    const userData = app.getPath('userData');
    ensureOutputDir(path.join(userData, 'blendit'));
    const outDir = ensureOutputDir(path.join(userData, 'blendit', "renderedImages"));

    // Where is blender binary?
    // const blenderDir = path.join(userData, "blender");
    const blenderExe = await resolveBlenderExe();

    // number of threads allowed by user
    const threadsArg = settings.cpuThreads ? ['--threads', String(settings.cpuThreads)] : [];

    // output pattern. frame_#####.png
    const outputPattern = path.join(outDir, job.outputPattern ?? 'frame_#####');

    const args = [
        '--background', job.blendFileLocalPath,
        '--render-output', outputPattern,
        '--render-format', 'PNG',
        '--render-frame', String(job.frame),
        ...threadsArg
    ];

    console.warn(args)

    // Start a blender process
    const child = spawn(blenderExe, args);

    const startedAt = Date.now();

    return new Promise((resolve, reject) => {
        child.stdout.on('data', (buf) => {
            const line: string = buf.toString();
            // // console.warn('[blender]: ' + line);

            const matchSample = line.match(/Sample (\d+)\/(\d+)/)
            const matchRemainingTime = line.match(/Remaining:([0-9:.]+)/)
            if (matchSample && matchRemainingTime) {
                const current = parseInt(matchSample[1], 10);
                const total = parseInt(matchSample[2], 10);
                const percent: number = Math.round(current*100/(total!=0 ? total : 1));

                const remainingTime: string = matchRemainingTime[1];

                onProgress({ percent, remainingTime })
            }

            // onProgress({line});

        });

        child.stderr.on('data', (bufr) => {
            console.error('Blender error: ', bufr.toString());
        });

        child.on('error', (err) => {
            reject(err);
        });

        child.on('close', (code) => {
            const duration = (Date.now() - startedAt) / 1000;
            const percent: number = 100;
            onProgress({ percent })
            if (code === 0) {
                resolve({ exitCode: code, outputDir: outDir, duration });
            } else {
                reject(new Error(`Blender exited with code ${code}`));
            }
        });
    })
}

function ensureOutputDir(dirPath: string): string {

  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err) {
    console.error("Failed to create projectFiles directory:", err);
    throw err;
  }
  return dirPath;
}

async function resolveBlenderExe() {

    const userData = app.getPath('userData');
    const blenderDir = path.join(userData, "blendit", "blender");
    const blenderExe = path.join(
        blenderDir,
        process.platform === "win32" 
            ? "blender-4.5.3-windows-x64"
            : process.platform === "linux"
                ? "blender-4.5.3-linux-x64" : "blender"
        , process.platform === "win32" 
            ? "blender.exe"
            : process.platform === "linux"
                ? "blender" : "Blender"
    );

    // check if $userData/blendit/blender/blender.exe exists
    if (await checkIfBlenderAvailableLocally()) {

        // else download and extract
        // console.warn("Downloading blender");
        // await downloadBlenderArchive(blenderDir);
        
        // check if executable runs
        // await execFileAsync(blenderExe, ["--version"]);
        // console.warn("Blender installed at:", blenderExe);

        return blenderExe;
    } else {
        throw Error("Blender not available");
    }

}

async function downloadFile(url: string, dest: string) {
    try {
        let previousPercentCompleted: number = -1;
        const response = await axios.get(
            url, 
            { 
                responseType: "stream",
                onDownloadProgress: (progressEvent) => {
                    if (progressEvent.total != null) {
                        const percentCompleted: number = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        console.warn("blender Download progress: ", percentCompleted);
                        //ipcRenderer.send('worker:blender-download-progress', percentCompleted);
                        // send renderer a ipc message about download progress
                        if (globalMainWindow && !globalMainWindow.isDestroyed() && previousPercentCompleted != percentCompleted) {
                            previousPercentCompleted = percentCompleted;
                            globalMainWindow.webContents.send(
                                "blender:blender-download-progress",
                                percentCompleted
                            );
                        }
                    }
                }
            }
        );
        const writer = fs.createWriteStream(dest);
        response.data.pipe(writer);
        return new Promise<void>((resolve, reject) => {
            
            let error: Error | null = null;
            writer.on("error", err => {
                error = err;
                writer.close();
                reject(err);
            });
            writer.on("close", () => {
                if (!error) resolve();
            });
        });
    } catch (error) {
        console.warn("there is an error downloading blender");
    }
}

export async function downloadBlenderArchive(destPath: string) {
    let url: string;
    let archiveName: string;

    if (process.platform === "win32") {
        url = blenderWinDownloadUrl;
        archiveName = "blender-4.5.3-windows-x64.zip";
    }else if (process.platform === "linux") {
        url = blenderLinuxDownloadUrl;
        archiveName = "blender-4.5.3-linux-x64.tar.xz";
    } else {
        url = blenderLinuxDownloadUrl;
        archiveName = "blender.zip";
    }
    let archivePath = destPath;

    // ensure $userData/blendit exists
    if (!fs.existsSync(archivePath)) {
        fs.mkdirSync(archivePath, {recursive: true});
    }

    archivePath = path.join(destPath, archiveName);

    console.warn("Downloading blender from " + url + " into " + archivePath);
    globalMainWindow.webContents.send('main:downloading-blender');
    await downloadFile(url, archivePath); // $userData/blendit/

    console.warn("Extracting Blender...");
    if (archiveName.endsWith('.zip')) {
        await extract(archivePath, { dir: destPath }); // extract to $/userData/blendit
    } else {
        await tar.x({file: archivePath, cwd: destPath});
    }
    globalMainWindow.webContents.send('main:blender-download-finished');

    // delete archive
    fs.unlinkSync(archivePath);
    console.warn("blender extracted to ", destPath);
}

export async function checkIfBlenderAvailableLocally() {
    const execFileAsync = promisify(execFile);

    const userData = app.getPath('userData');
    const blenderDir = path.join(userData, "blendit", "blender");
    const blenderExe = path.join(
        blenderDir,
        process.platform === "win32" 
            ? "blender-4.5.3-windows-x64"
            : process.platform === "linux"
                ? "blender-4.5.3-linux-x64" : "blender"
        , process.platform === "win32" 
            ? "blender.exe"
            : process.platform === "linux"
                ? "blender" : "Blender"
    );

    // check if $userData/blendit/blender/blender.exe exists
    if (fs.existsSync(blenderExe)) {
        try {
            await execFileAsync(blenderExe, ["--version"]);
            // window.api.send("main:blender-already-available");
            globalMainWindow.webContents.send('main:blender-bin-available')
            console.warn("blender available...");
            return true;
            
        } catch (error) {
            console.warn(error + " Blender binary exists but failed to run");
            return false;
        }
    } //else await downloadBlenderArchive(blenderDir);
    return false;
}