import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export type Job = {
  id: string;
  outputPattern?: string;
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
  fileName: string;
}

export type JobFileMetadata = {
  workerId?: string;
  userId: string;
  projectId: number;
  fileName: string;
  frame: number;
  jobId: number;
}

// }
// "status", "successs",
// 				"url", url,
// 				"jobId", registeredJob.getJobId(),
// 				"projectId", projectId,
// 				"userId", userId,
// 				"frame", frame));

export const blenderWinDownloadUrl = 'https://mirror.clarkson.edu/blender/release/Blender4.5/blender-4.5.0-windows-x64.zip'
export const blenderLinuxDownloadUrl = 'https://mirror.clarkson.edu/blender/release/Blender4.5/blender-4.5.0-linux-x64.tar.xz'