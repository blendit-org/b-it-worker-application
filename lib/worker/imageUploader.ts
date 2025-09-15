import axios from "axios";
import keytar from 'keytar';
import fs from "fs";
import { JobFileMetadata, workerHandlerApi } from "../utils";

let tryAgain: boolean = true;

export async function uploadImageToServer(
    imgPath: string,
    jobFileMetadata: JobFileMetadata) {
    const token = await keytar.getPassword("org.blendit", "auth-token");
    try {
        const response = await axios({
            method: 'get',
            baseURL: workerHandlerApi,
            url: '/api/worker/image-upload',

            headers: {
                Authorization: `Bearer ${token}`
            },

            data: jobFileMetadata,
        });

        const presignedUploadUrl = response.data.url;
        console.warn("image upload url: ", presignedUploadUrl);

        const fileStream = fs.createReadStream(imgPath);

        if (presignedUploadUrl) {
            const response = await axios({
                method: 'put',
                url: presignedUploadUrl,
                headers: {
                    'Content-Type': 'application/octet-stream',
                },
                data: fileStream,
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
            });
            console.warn("Upload Success: ");

            const success = await axios({
                method: 'post',
                baseURL: workerHandlerApi,
                url: '/api/worker/job-success',

                headers: {
                    Authorization: `Bearer ${token}`
                },

                data: jobFileMetadata,
            });

            
            console.warn("acknowledge success: ");
        }
    } catch (error) {
        console.error("Can not get upload image url: ", error);
        // try once more to upload
        if (tryAgain) {
            await uploadImageToServer(imgPath, jobFileMetadata);
            tryAgain = false; // risky @pritomash
        }
        throw error;
        
    }

}