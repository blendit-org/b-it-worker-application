import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export type Job = {
  id: string;
  outputPattern: string;
  blendFileLocalPath: string;
  frame: number;
}

export type Settings = { 
  blenderPath?: string; 
  cpuThreads?: number;
};

export type UserInfo = {
  email: string,
  password: string
};

export const enum HttpResponseStatus {
  OK = 200,
  UNAUTHORIZED = 401,
  BAD_REQUEST = 400,
  INTERNAL_SERVER_ERROR = 500
}

export type JobApiResponse = {
  status: string;
  url: string;
  jobId: number;
  projectId: number;
  userId: string;
  frame: number;
}
// }
// "status", "successs",
// 				"url", url,
// 				"jobId", registeredJob.getJobId(),
// 				"projectId", projectId,
// 				"userId", userId,
// 				"frame", frame));