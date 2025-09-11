

export async function loop() {
    /** If stop job is called this loop closes with a warning
     * ?: Do you want to stop after this project is finished rendering
     * [Stop immediately] [Stop after current rendering is complete]
     * 
     */


    /**
     * fetch job from workerHandler server
     * show progress and size of downloading file
     */

    /**
     * render the project
     */

    /**
     * report render finished to workerHandler
     * and upload the rendered image to GCS
     */

    /**
     * If any of these processes fail, retry with a 1 minute break,
     * to avoid server load
     */
}