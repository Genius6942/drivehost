import axios from "axios";
import { toast as toastDef } from "react-toastify";

function splitFileIntoChunks(file: File, chunkSize = 2 * 1024 * 1024) {
  const fileSize = file.size;
  const chunks = [];
  let start = 0;
  while (start < fileSize) {
    const end = Math.min(start + chunkSize, fileSize);
    const chunk = file.slice(start, end);
    chunks.push({ start, end, chunk });
    start = end;
  }
  return chunks;
}

// Function to upload a chunk to the server
async function uploadChunkToServer(
  chunk: { start: number; end: number; chunk: Blob },
  mimeType: string,
  url: string,
  fileSize: number
) {
  console.log(
    "Chunk with size",
    chunk.chunk.size,
    "from",
    chunk.start,
    "to",
    chunk.end
  );
  const formData = new FormData();
  formData.append("chunk", chunk.chunk);
  formData.append("start", chunk.start.toString());
  formData.append("end", chunk.end.toString());
  formData.append("mimeType", mimeType);
  formData.append("url", url);
  formData.append("total", fileSize.toString());
  try {
    const data = await axios.post("/api/app/uploadChunk", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data;
  } catch (e) {
    console.log("retry chunk", chunk.start, "to", chunk.end);

    const data = await axios.post("/api/app/uploadChunk", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data;
  }
}

export const uploadFileInChunks = async (
  file: File,
  chunkSize: number = 2 * 1024 * 1024,
  toast: typeof toastDef
) => {
  const chunks = splitFileIntoChunks(file, chunkSize);

  const toastId = toast(`Uploading ${file.name}...`, {
    autoClose: false,
    closeOnClick: false,
    progress: 0.00001,
    toastId: file.name,
  });

  const startRes = await axios.post(
    "/api/app/startChunkUpload",
    {
      name: file.name,
      mimeType: file.type,
      size: file.size,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const url = startRes.data.url;
  console.log("uploading at", url);
  console.log(startRes);
  const totalFileSize = file.size;
  console.log("Total file size", totalFileSize);

  for (let i = 0; i < chunks.length; i++) {
    console.log("Uploading chunk", i);
    const chunk = chunks[i];
    await uploadChunkToServer(chunk, file.type, url, totalFileSize);

    toast.update(toastId, {
      render: `Uploading ${file.name}... ${Math.round(
        ((i + 1) / chunks.length) * 100
      )}%`,
      progress: (i + 1) / chunks.length,
    });
  }

  toast.done(toastId);
  return true;
};
