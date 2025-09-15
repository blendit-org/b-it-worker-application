import path from "path";
import { Job, JobApiResponse, JobFileMetadata, scoringSystemApi, Settings, Work } from "../utils";
import { fetchJob } from "./jobManager";
import { app } from "electron";
import { runBlenderForRenderingImages } from "./blender";
import fs from "fs";
import { uploadImageToServer } from "./imageUploader";
import { globalMainWindow } from "../main/main";
import axios from "axios";
import keytar from 'keytar'
import os from "os"

let stopJobFlag = false;
let cpuThreadsFlag: number = 0;
let globalFileName = "";
let globalFrameName = "";

export function stopWhenCurrentJobIsFinished() {
    stopJobFlag = true;
    console.warn("Stopping rendering after current job is finished...")
}
/**
 * This will be applied to the next render...
 */
export function setCpuThreadsRuntime(allowedCpuThreads: number) {
    cpuThreadsFlag = allowedCpuThreads;
    console.warn("[loop] cpu thread flag changed: ", cpuThreadsFlag);
}

export async function loop(allowedCpuThreads: number) {
    stopJobFlag = false;
    cpuThreadsFlag = allowedCpuThreads;
    while (!stopJobFlag) {
        console.warn("hello loop");

        globalMainWindow.webContents.send('worker:start-job-fetching');

        try {
            /** If stop job is called this loop closes with a warning
            * ?: Do you want to stop after this project is finished rendering
            * [Stop immediately] [Stop after current rendering is complete]
            * 
            */


            /**
             * fetch job from workerHandler server
             * show progress and size of downloading file
             */

            const jobApiResponse : JobApiResponse | null = await fetchJob();
            console.warn("[loop] job api response: ", jobApiResponse);

            if (jobApiResponse == null) {
                // wait 1 minute before sending another request to server to avoid overloading
                console.warn("waiting 1 minute");
                await new Promise(resolve => setTimeout(resolve, 15_000));
                continue;
            }


            /**
             * render the project
             */

            const pathToProject = path.join(app.getPath('userData'), 'blendit', "projectFiles", jobApiResponse.fileName);
            const job: Job = {
                id: String (jobApiResponse.jobId),
                outputPattern: 'frame_#####',
                blendFileLocalPath: pathToProject,
                frame: jobApiResponse.frame,
            }
            const settings: Settings = {
                cpuThreads: cpuThreadsFlag,
            }
            console.warn("[loop] job: ", job);
            console.warn("[loop] settings: ", settings);
            let prevRenderPercentage: number = -1;
            try {
                const renderStartTime = Date.now();
                await runBlenderForRenderingImages(job, settings, (msg) => {
                    // console.warn(msg);
                    if (globalMainWindow && !globalMainWindow.isDestroyed() && prevRenderPercentage != msg.percent) {
                        prevRenderPercentage = msg.percent;
                        globalMainWindow.webContents.send('worker:render-progress', parseInt(msg.percent), msg.remainingTime);
                    }
                });
                const renderTime = Date.now() - renderStartTime;
                scoreThisWork(renderTime, cpuThreadsFlag);
            } catch (error) {
                console.warn(error);
            }
            

            /**
             * report render finished to workerHandler
             * and upload the rendered image to GCS
             */
            const frameName = "frame_" + String(jobApiResponse.frame).padStart(5, '0') + ".png";
            const imgPath = path.join(app.getPath('userData'), 'blendit', "renderedImages", frameName);

            globalFileName = jobApiResponse.fileName; // if anything fails
            globalFrameName = frameName;

            const jobFileMetadata: JobFileMetadata = {
                userId: jobApiResponse.userId,
                projectId: jobApiResponse.projectId,
                fileName: frameName,
                frame: jobApiResponse.frame,
                jobId: jobApiResponse.jobId
            }
            console.warn("[loop] frameName: ", jobApiResponse);
            console.warn("[loop] image path: ", imgPath);
            console.warn("[loop] job file metadata: ", jobFileMetadata);

            await uploadImageToServer(imgPath, jobFileMetadata);

            // remove completed project and frame
            removeAllArchives(globalFileName, globalFrameName);


        } catch (error) {
            //console.error(error);
            /**
             * If any of these processes fail, retry with a 1 minute break,
             * to avoid server load
             */
            //console.warn("deleting files...");
            //removeAllArchives(globalFileName, globalFrameName);
            console.warn("waiting 1 minute");
            await new Promise(resolve => setTimeout(resolve, 60_000));
            continue;
        }

        console.warn("wait 15 seconds before next loop start");
        await new Promise(resolve => setTimeout(resolve, 3_000));
    }
    globalMainWindow.webContents.send('main:stopped-after-finishing-job');
    console.warn("Job stopped!!!!");
}

function removeAllArchives(projectName: string, frameName: string) {
    const projectFilePath = path.join(app.getPath('userData'), 'blendit', 'projectFiles', projectName);
    const imageFilePath = path.join(app.getPath('userData'), 'blendit', 'renderedImages', frameName);
    if (fs.existsSync(projectFilePath)) {
        fs.unlink(
            projectFilePath, 
            (err) => {
                if (err) throw err;
                console.warn('blender_project.blend was deleted');
            }
        );
    }
    if (fs.existsSync(imageFilePath)) {
        fs.unlink(
            imageFilePath, 
            (err) => {
                if (err) throw err;
                console.warn(frameName, ' was deleted');
            }
        );
    }
}

async function scoreThisWork(renderTime: number, cpu: number) {
    try {
        const token = await keytar.getPassword("org.blendit", "auth-token");
        const work: Work = {
            workTime: renderTime,
            cpu: cpu[0],
            cpuPower: os.cpus()[0].speed,
        }
        const response = await axios({
            method: 'post',
            baseURL: scoringSystemApi,

            url: '/score/worker',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            data: work
        });
        console.warn('score this work: ', response.data);
        globalMainWindow.webContents.send('main:worker-information', response.data.user.userId, response.data.user.score);
    } catch (error) {
        console.warn('cannot score this', error);
    }
}
