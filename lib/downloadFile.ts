import axios from "axios";

export default function downloadFile(
  fileId: string,
  chunkSize = 2 * 1024 * 1024
) {
  let shouldKill = false;
  return {
    stop: () => (shouldKill = true),
    result: (async function downloadFileInner(
      fileId: string,
      chunkSize = 2 * 1024 * 1024
    ) {
      const { name, mimeType, size } = (
        await axios.post(
          "/api/app/chunkDownload/" + fileId + "/start",
          {},
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      ).data.data;
      console.log(name, mimeType, size);

      const chunks = Math.ceil(size / chunkSize);
      const blobs = [];
      for (let i = 0; i < chunks; i++) {
        if (shouldKill) return;
        try {
          const res = await fetch(
            "/api/app/chunkDownload/" + fileId + "/chunk",

            {
              headers: {
                "Content-Type": "application/json",
              },
              method: "POST",
              body: JSON.stringify({
                start: i * chunkSize,
                end: Math.min((i + 1) * chunkSize, size) - 1,
              }),
            }
          );
          console.log("Completed chunk", i, "/", chunks);
          blobs.push(await res.blob());
        } catch (e) {
          const res = await fetch(
            "/api/app/chunkDownload/" + fileId + "/chunk",

            {
              headers: {
                "Content-Type": "application/json",
              },
              method: "POST",
              body: JSON.stringify({
                start: i * chunkSize,
                end: Math.min((i + 1) * chunkSize, size) - 1,
              }),
            }
          );
          console.log("Completed chunk", i, "/", chunks);
          blobs.push(await res.blob());
        }
      }
      const blob = new Blob(blobs, { type: mimeType });
      return blob;
    })(fileId, chunkSize),
  };
}
