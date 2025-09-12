import { execFile, spawn } from "child_process";
import path from "path";
import { blenderLinuxDownloadUrl, blenderWinDownloadUrl, Job, Settings } from "../utils";
import fs from "fs"
import { app } from "electron";
import { promisify } from "util";
import axios from "axios";
import extract from "extract-zip";
import * as tar from "tar";

export async function runBlenderForRenderingImages(
    job: Job,
    settings: Settings,
    onProgress: (p: any) => void) {
    
    // Output directory of rendered image
    const userData = app.getPath('userData');
    const outDir = ensureOutputDir(path.join(userData, 'projectFiles', "renderedImages"));

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
            const line = buf.toString();
            console.warn('[blender]: ' + line);

            onProgress({line});

        });

        child.stderr.on('data', (bufr) => {
            console.error('Blender error: ', bufr.toString());
        });

        child.on('error', (err) => {
            reject(err);
        });

        child.on('close', (code) => {
            const duration = (Date.now() - startedAt) / 1000;
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
    const execFileAsync = promisify(execFile);

    const userData = app.getPath('userData');
    const blenderDir = path.join(userData, "blendit", "blender");
    const blenderExe = path.join(
        blenderDir,
        process.platform === "win32" 
            ? "blender-4.5.0-windows-x64"
            : process.platform === "linux"
                ? "blender-4.5.0-linux-x64" : "blender"
        , process.platform === "win32" 
            ? "blender.exe"
            : process.platform === "linux"
                ? "blender" : "Blender"
    );

    // check if $userData/blendit/blender/blender.exe exists
    if (fs.existsSync(blenderExe)) {
        try {
            await execFileAsync(blenderExe, ["--version"]);
            console.warn("Blender is already installed and working");
            return blenderExe;
        } catch (error) {
            console.warn(error + " Blender binary exists but failed to run, redownloading");
        }
    }

    // else download and extract
    console.warn("Downloading blender");
    await downloadBlenderArchive(blenderDir);
    
    // check if executable runs
    await execFileAsync(blenderExe, ["--version"]);
    console.warn("Blender installed at:", blenderExe);

    return blenderExe;

}

async function downloadFile(url: string, dest: string) {
  const writer = fs.createWriteStream(dest);
  const response = await axios.get(url, { responseType: "stream" });

    return new Promise<void>((resolve, reject) => {
        response.data.pipe(writer);
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
}

async function downloadBlenderArchive(destPath: string) {
    let url: string;
    let archiveName: string;

    if (process.platform === "win32") {
        url = blenderWinDownloadUrl;
        archiveName = "blender.zip";
    }else if (process.platform === "linux") {
        url = blenderLinuxDownloadUrl;
        archiveName = "blender.tar.xz";
    } else {
        url = blenderLinuxDownloadUrl;
        archiveName = "blender.zip";
    }
    const archivePath = path.join(destPath, archiveName);

    // ensure $userData/blendit exists
    if (!fs.existsSync(archivePath)) {
        fs.mkdirSync(archivePath, {recursive: true});
    }

    console.warn("Downloading blender from " + url + " into " + archivePath);
    await downloadFile(url, archivePath); // $userData/blendit/blender.zip

    console.warn("Extracting Blender...");
    if (archiveName.endsWith('.zip')) {
        await extract(archivePath, { dir: destPath }); // extract to $/userData/blendit
    } else {
        await tar.x({file: archivePath, cwd: destPath});
    }

    // delete archive
    fs.unlinkSync(archivePath);
    console.warn("blender extracted to ", destPath);
}