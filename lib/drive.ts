import fs from "fs/promises";
import path from "path";
import process from "process";
import { authenticate } from "@google-cloud/local-auth";
import { drive_v3, google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import axios, { AxiosError } from "axios";
import axiosDebugLog from "axios-debug-log";

axiosDebugLog({
  // Log content type
  request: function (debug, config) {
    // @ts-ignore
    debug("Request with " + config.headers["content-type"]);
  },
  response: function (debug, response) {
    debug(
      "Response with " + response.headers["content-type"],
      "from " + response.config.url
    );
  },
  error: function (debug, error) {
    // Read https://www.npmjs.com/package/axios#handling-errors for more info
    debug("Boom", error);
  },
});

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/drive"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    // @ts-ignore
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 */
async function saveCredentials(client: OAuth2Client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  //@ts-ignore
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

let authCache = null as null | OAuth2Client;

async function fileExists(path: string) {
  try {
    await fs.readFile(path);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Load or request or authorization to call APIs.
 *
 */
export async function authorize() {
  if (authCache && (await fileExists("token.json"))) {
    return authCache;
  }
  const client = await loadSavedCredentialsIfExist();
  if (client) {
    authCache = client as any;
    return client;
  }
  const newClient = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (newClient.credentials) {
    await saveCredentials(newClient);
  }
  authCache = newClient;
  return newClient;
}

const getDrive = async () => google.drive({ version: "v3", auth: await authorize() });

export default getDrive;

const folderName = "file_hosting_application_dont_touch";

const getRootFolder = async () => {
  const drive = await getDrive();
  const res = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`,
  });
  if (res.data.files?.length) {
    return res.data.files[0];
  } else {
    return createRootFolder();
  }
};

const createRootFolder = async () => {
  const drive = await getDrive();
  const res = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    },
  });
  return res.data;
};

const getUserFolder = async (uid: string) => {
  const drive = await getDrive();
  const res = await drive.files.list({
    q: `name='${uid}' and mimeType='application/vnd.google-apps.folder' and '${
      (
        await getRootFolder()
      ).id
    }' in parents`,
  });
  if (res.data.files?.length) {
    return res.data.files[0];
  } else {
    return createUserFolder(uid);
  }
};

const createUserFolder = async (uid: string) => {
  const drive = await getDrive();
  const res = await drive.files.create({
    requestBody: {
      name: uid,
      mimeType: "application/vnd.google-apps.folder",
      parents: [(await getRootFolder()).id as string],
    },
  });
  return res.data;
};

const getUserFiles = async (uid: string) => {
  const drive = await getDrive();
  const res = await drive.files.list({
    q: `'${((await getUserFolder(uid)) as drive_v3.Schema$File).id}' in parents`,
    fields:
      "files(name, mimeType, fileExtension, id, webContentLink, webViewLink, iconLink, thumbnailLink, size, fullFileExtension)",
  });
  return res.data.files;
};

const downloadUserFile = async (uid: string, fileId: string) => {
  const accessToken = (await (await authorize()).getAccessToken()).token;

  // make file temporarily public
  // const perm = await (
  //   await getDrive()
  // ).permissions.create({
  //   fileId,
  //   requestBody: {
  //     role: "reader",
  //     type: "anyone",
  //   },
  // });

  // const res = await (
  //   await getDrive()
  // ).files.get({
  //   fileId: fileId,
  //   alt: "media",
  // });

  // const d = res.data as string;
  // const l = d.length;
  // const array = new Uint8Array(l);
  // for (var i = 0; i < l; i++) {
  //   array[i] = d.charCodeAt(i);
  // }
  // const blob = new Blob([array], { type: res.headers["content-type"] });

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  const blob = await res.blob();

  // make file private again
  // await (
  //   await getDrive()
  // ).permissions.delete({
  //   fileId,
  //   permissionId: perm.data.id as string,
  // });
  return blob;
};

const startChunkedDownload = async (fileId: string) => {
	const drive = await getDrive();
	const res = await drive.files.get({
		fileId: fileId,
		fields: "size, mimeType, name",
	});
	const size = parseInt(res.data.size as string);
	const mimeType = res.data.mimeType as string;
	const name = res.data.name as string;
	return { size, mimeType, name };
};

const downloadFileChunk = async (
	fileId: string,
	start: number,
	end: number,
) => {
	const accessToken = (await (await authorize()).getAccessToken()).token;
	const res = await fetch(
		`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Range: `bytes=${start}-${end}`,
			},
		}
	);
	const blob = await res.blob();
	return blob;
};

/**
 *
 * @param uid - user id
 * @param filePath - full file path to file for uploading
 * @returns
 */
const uploadUserFile = async (
  uid: string,
  name: string,
  filePath: string,
  mimeType: string
) => {
  const auth = await authorize();
  const accessToken = (await auth.getAccessToken()).token;

  const filename = filePath; // Please set the filename with the path.

  const fileSize = (await fs.stat(filename)).size;

  // 1. Retrieve session for resumable upload.
  try {
    const res = await axios(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        data: JSON.stringify({
          name,
          mimeType,
          parents: [((await getUserFolder(uid)) as drive_v3.Schema$File).id as string],
        }),
      }
    );
    // 2. Upload the file.
    const result = await axios(res.headers.location, {
      method: "PUT",
      headers: {
        "Content-Range": `bytes 0-${fileSize - 1}/${fileSize}`,
        Authorization: `Bearer ${accessToken}`,
      },
      data: await fs.readFile(filename),
    });

    return result.data;
  } catch (e) {
    console.error((e as any).stack);
    return e;
  }
};

// const startUserChunkUpload = async (uid: string, name: string, mimeType: string) => {
//   const auth = await authorize();
//   const accessToken = (await auth.getAccessToken()).token;

//   // 1. Retrieve session for resumable upload.
//   try {
//     const res = await axios(
//       "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           "Content-Type": "application/json",
//         },
//         data: JSON.stringify({
//           name,
//           mimeType,
//           parents: [((await getUserFolder(uid)) as drive_v3.Schema$File).id as string],
//         }),
//       }
//     );

//     return res.headers.location as string;
//   } catch (e) {
//     console.error((e as any).stack);
//     return e as string;
//   }
// };

// const uploadUserFileChunk = async (
//   location: string,
//   filePath: string,
//   start: number,
//   end: number,
//   total: number
// ) => {
//   const auth = await authorize();
//   const accessToken = (await auth.getAccessToken()).token;
//   console.log("recieved chunk", start, "to", end);

//   try {
//     const result = await axios(location, {
//       method: "PUT",
//       headers: {
//         "Content-Length": `${end - start}`,
//         "Content-Range": `bytes ${start}-${end}/${total}`,
//         Authorization: `Bearer ${accessToken}`,
//       },
//       onUploadProgress: (e) => {
//         console.log("Upload Progress:", e.loaded / (e.total || 1));
//       },
//       onDownloadProgress: (e) => {
//         console.log("Download Progress:", e.loaded / (e.total || 1));
//       },

//       data: await fs.readFile(filePath),
//     });

//     return result.data;
//   } catch (e) {
//     console.log("Drive chunk error:");
//     console.error((e as any).stack);
//     console.log(end - start, start, end, total);
//     console.log(e);
//     return false;
//   }
// };

const startUserChunkUpload = async (uid: string, name: string, mimeType: string) => {
  const drive = await getDrive();
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType,
      parents: [((await getUserFolder(uid)) as drive_v3.Schema$File).id as string],
    },
    media: {
      mimeType,
      body: "",
    },
  });
  return res.data.id as string;
};

const uploadUserFileChunk = async (
  id: string,
  mimeType: string,
  chunk: any,
  start: number,
  end: number,
  total: number
) => {
  const drive = await getDrive();
  console.log(id);
  const res = await drive.files.update(
    {
      fileId: id,
      media: {
        mimeType,
        body: chunk,
      },
      // id and size
      fields: "id, size",
    },
    {
      headers: {
        "Content-Range": `bytes ${start}-${end}/${total}`,
      },
    }
  );
  console.log(chunk);
  console.log(res.data);
};

async function getUploadUrl(
  uid: string,
  name: string,
  mimeType: string,
  size: number
): Promise<string> {
  const auth = await authorize();
  const accessToken = (await auth.getAccessToken()).token;

  const res = await axios.post(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
    {
      name,
      mimeType,
      parents: [(await getUserFolder(uid)).id as string],
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Upload-Content-Type": mimeType,
        "X-Upload-Content-Length": size.toString(),
        "Content-Type": "application/json; charset=UTF-8",
      },
    }
  );

  return res.headers["location"];
}

async function uploadChunk(
  url: string,
  mimeType: string,
  chunk: Buffer,
  start: number,
  end: number,
  total: number
) {
  try {
    console.log("uploading chunk...");
    await axios.put(url, chunk, {
      headers: {
        "Content-Type": mimeType,
        "Content-Range": `bytes ${start}-${end - 1}/${total}`,
      },
    });
    const res = await axios.patch(url, null, {
      headers: {
        "Content-Range": `bytes */${total}`,
      },
    });
    console.log("uploaded, upload complete", res.data);
    return res.data;
  } catch (e) {
    if ((e as any).response.status === 308) {
      console.log("uploaded with error 308  incomplete");
      console.log("Range:", (e as any).response.headers["range"]);

      return true;
    } else {
      throw e;
    }
  }
}

const deleteUserFile = async (uid: string, fileId: string) => {
  const drive = await getDrive();
  const res = await drive.files.list({
    q: `'${((await getUserFolder(uid)) as drive_v3.Schema$File).id}' in parents`,
  });

  if (
    res.data.files &&
    res.data.files.map((file) => file.id as string).includes(fileId)
  ) {
    await drive.files.delete({ fileId });
    return true;
  } else {
    return false;
  }
};

const deleteUserAllFiles = async (uid: string) => {
  const drive = await getDrive();
  const res = await drive.files.list({
    q: `'${((await getUserFolder(uid)) as drive_v3.Schema$File).id}' in parents`,
  });

  if (res.data.files) {
    await Promise.all(
      res.data.files.map((file) => drive.files.delete({ fileId: file.id as string }))
    );
    return true;
  } else {
    return false;
  }
};

export {
  getRootFolder,
  createRootFolder,
  getUserFolder,
  createUserFolder,
  getUserFiles,
  downloadUserFile,
	startChunkedDownload,	
	downloadFileChunk,
  uploadUserFile,
  startUserChunkUpload,
  uploadUserFileChunk,
  getUploadUrl,
  uploadChunk,
  deleteUserFile,
  deleteUserAllFiles,
};
