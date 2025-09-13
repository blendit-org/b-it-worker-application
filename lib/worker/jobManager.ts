import axios from "axios";
import keytar from 'keytar'
import { JobApiResponse } from "../utils";
import { app } from "electron";
import path from "path";
import fs from "fs";

export async function fetchJob() {
    console.warn("fetch job called...");

    const token = await keytar.getPassword("org.blendit", "auth-token");
    console.warn("[fetchJob] token:", token);
    // TODO: Fetch job from fileserver
    try {
        const response = await axios(
            {
                method: 'post',
                baseURL: 'http://localhost:4001',

                url: '/api/worker/job-request',
                headers: {
                    'Authorization' : `Bearer ${token}`
                }
            }
        )
        console.warn("Response data from job-request api: ", response.data);
        const job : JobApiResponse = response.data;
        //console.warn(job.url + " " + job.frame + " " + job.jobId + " " +  job.projectId + " " + job.status + " " + job.userId)

        // download project from Google Cloud Storage and store in userData
        if (job.status == "success") {
            const userDataPath = ensureProjectFilesDir(job.fileName); // $/userData/blendit/projectFiles/blender_project.blend
            const downloadSuccessful = await downloadFileFromGCS(job.url, userDataPath);
            console.warn("download successful " + downloadSuccessful);
            console.warn("path to file: " + userDataPath);
            return job;
        }
        return null;
        
    } catch (error) {
        console.warn("hi there is an error at fetch Job");
        //console.error(error);
        throw error;
    }
}

/**
 * Ensures the projectFiles directory exists inside app.getPath("userData").
 * Returns the full path to the directory.
 */
function ensureProjectFilesDir(fileName: string): string {
  const dirPath = path.join(app.getPath("userData"), "blendit", "projectFiles");

  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err) {
    console.error("Failed to create projectFiles directory:", err);
    throw err;
  }
  return path.join(dirPath, fileName);
}

async function downloadFileFromGCS(presignedUrl: string, localFilePath: string) {
    try {
        const response = await axios({
            method: 'get',
            url: presignedUrl,
            responseType: 'stream',
            onDownloadProgress: (progressEvent) => {
                const percentCompleted = Math.round(progressEvent.loaded * 100 / (progressEvent.total ? progressEvent.total : 1));
                console.warn("Project Download progress: ", percentCompleted);
            }
        });

        const writer = fs.createWriteStream(localFilePath);
        response.data.pipe(writer);

        return new Promise((_resolve, _reject) => {
            writer.on('finish', () => _resolve('File download successfully'));
            writer.on('error', _reject);
        });
    } catch (error) {
        console.error('Error downloading file: ', error);
        throw error;
    }
}

/**
rabbitmqadmin publish exchange=amq.default routing_key=projectQueue payload='{
> "userId": "pritomshad",
> "projectId": 502,
> "fileName": "66196c45-bb46-4ee0-8192-0b7c999822d1_blender-3.5-splash.blend",
> "frame": 150
> }'

*/