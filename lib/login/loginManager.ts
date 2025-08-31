import axios from "axios";
import { UserInfo } from "../utils";

export async function login(userInfo: UserInfo) {
    try {
        const response = await axios(
            {
                method: 'post',
                baseURL: 'http://localhost:8005',

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