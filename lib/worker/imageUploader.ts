import axios from "axios";
import keytar from 'keytar';
import fs from "fs";
import { JobFileMetadata } from "../utils";

export async function uploadImageToServer(
    imgPath: string,
    jobFileMetadata: JobFileMetadata) {
    const token = await keytar.getPassword("org.blendit", "auth-token");
    try {
        const response = await axios({
            method: 'post',
            baseURL: 'http://localhost:4001',
            url: '/api/worker/job-success',

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
                maxContentLength: Infinity
            });
            console.warn("Upload Success: ", response);
        }
    } catch (error) {
        console.error("Can not get upload image url: ", error);
        throw error;
    }

}