import path from "path";
import { Job, JobApiResponse, JobFileMetadata, Settings } from "../utils";
import { fetchJob } from "./jobManager";
import { app } from "electron";
import { runBlenderForRenderingImages } from "./blender";
import fs from "fs";
import { uploadImageToServer } from "./imageUploader";

let stopJobFlag = false;

export function stopWhenCurrentJobIsFinished() {
    stopJobFlag = true;
    console.warn("Stopping rendering after current job is finished...")
}

export async function loop(allowedCpuThreads: number) {
    stopJobFlag = false;
    while (!stopJobFlag) {
        console.warn("hello loop");
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
                await new Promise(resolve => setTimeout(resolve, 60_000));
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
                cpuThreads: allowedCpuThreads
            }
            console.warn("[loop] job: ", job);
            console.warn("[loop] settings: ", settings);
            await runBlenderForRenderingImages(job, settings, (msg) => {console.warn(msg)});
            

            /**
             * report render finished to workerHandler
             * and upload the rendered image to GCS
             */
            const frameName = "frame_" + String(jobApiResponse.frame).padStart(5, '0') + ".png";
            const imgPath = path.join(app.getPath('userData'), 'blendit', "renderedImages", frameName);
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
            removeAllArchives(jobApiResponse.fileName, frameName);


        } catch (error) {
            //console.error(error);
            /**
             * If any of these processes fail, retry with a 1 minute break,
             * to avoid server load
             */
            console.warn("waiting 1 minute");
            await new Promise(resolve => setTimeout(resolve, 60_000));
            continue;
        }



        
        await new Promise(resolve => setTimeout(resolve, 5_000));
    }
    console.warn("Job stopped!!!!");
}

function removeAllArchives(projectName: string, frameName: string) {
    fs.unlink(
        path.join(app.getPath('userData'), 'blendit', 'projectFiles', projectName), 
        (err) => {
            if (err) throw err;
            console.warn('blender_project.blend was deleted');
        }
    );
    fs.unlink(
        path.join(app.getPath('userData'), 'blendit', 'renderedImages', frameName), 
        (err) => {
            if (err) throw err;
            console.warn(frameName, ' was deleted');
        }
    );
}