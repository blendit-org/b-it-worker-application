import axios from "axios";
import { authApiUrl, UserInfo } from "../utils";

export async function login(userInfo: UserInfo) {
    try {
        const response = await axios(
            {
                method: 'post',
                baseURL: authApiUrl,

                url: '/auth/login',
                data: {
                    "email": userInfo.email,
                    "password": userInfo.password
                }

            }
        )
        return response;
    } catch (error) {
        // console.error(error);
        return error.response;
    }
}

export async function getWorkerInfo(token: string) {
    try {
        const response = await axios(
            {
                method: 'get',
                baseURL: authApiUrl,

                url: '/users/me',
                headers: {
                    Authorization: `Bearer ${token}`,
                }

            }
        )
        return response;
    } catch (error) {
        // console.error(error);
        return error.response;
    }
}

