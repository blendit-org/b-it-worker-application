import path from "path";
import { JobApiResponse } from "../utils";
import { fetchJob } from "./jobManager";
import { app } from "electron";


export async function loop() {
    while (true) {
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

        if (jobApiResponse == null) {
            // wait 1 minute before sending another request to server to avoid overloading
            await new Promise(resolve => setTimeout(resolve, 60_000));
            continue;
        }


        /**
         * render the project
         */

        const pathToProject = path.join(app.getPath('userData'), "projectFiles", "blender_project.blend");
        

        /**
         * report render finished to workerHandler
         * and upload the rendered image to GCS
         */

        /**
         * If any of these processes fail, retry with a 1 minute break,
         * to avoid server load
         */
    }
}