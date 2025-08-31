import { spawn } from "child_process";
import path from "path";
import { Job, Settings } from "../utils";
import fs from "node:fs/promises"

export async function runBlenderForRenderingImages(
    job: Job,
    settings: Settings,
    onProgress: (p: any) => void) {
    
    // Output directory of rendered image
    const outDir = path.join(process.cwd(), '.renders', `job_${job.id}`);
    await fs.mkdir(outDir, { recursive: true });

    // Where is blender binary?
    const blenderExe = settings.blenderPath || 'blender';

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