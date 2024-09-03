import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import { uploadChunk, uploadUserFile, uploadUserFileChunk } from "@/lib/drive";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
// import bodyParser from "body-parser";
import fs from "fs/promises";
// import { createRouter } from "next-connect";
import multer, { Multer } from "multer";
// const router = createRouter<NextApiRequest, NextApiResponse>();
// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   const session = await getServerSession(req, res, authOptions);
//   if (!session || !session.user) {
//     res.status(403).send({ success: false, error: "Not authenticated" });
//     return;
//   }
//   console.log("recived");
//   const uid = session.user.id;

//   const form = formidable({
//     multiples: true,
//   });

//   const {
//     err,
//     fields,
//     files,
//   }: { err: any; fields: formidable.Fields; files: formidable.Files } = await new Promise(
//     (resolve) =>
//       form.parse(req, (err, fields, files) => {
//         resolve({ err, fields, files });
//       })
//   );
//   if (err) {
//     console.error("Error", err);
//     res.status(500).send({ success: false, error: err });
//     return;
//   }

// 	let {
//     location: oldLocation,
//     start: oldStart,
//     end: oldEnd,
//     total: oldTotal,
//   }: {
//     location: [string];
//     start: [string];
//     end: [string];
//     total: [string];
//   } = fields as any;

// 	const location = oldLocation[0];
// 	const start = parseInt(oldStart[0]);
// 	const end = parseInt(oldEnd[0]);
// 	const total = parseInt(oldTotal[0]);

//   const [file] = files.file as formidable.File[];

//   const path = file.filepath;

//   const result = await uploadUserFileChunk(
// 		location,
// 		path,
// 		start,
// 		end,
// 		total,
// 	);

// 	if (!result) {
// 		res.status(500).send({ success: false, error: "Failed to upload chunk" });
// 		return;
// 	}

//   res.status(200).send({ success: true, result });
//   return;
// }

export const config = {
  api: {
    bodyParser: false,
  },
};

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse
// ) {
//   const form = formidable();

//   console.log("Chunk recieved");
//   const {
//     err,
//     fields,
//     files,
//   }: { err: any; fields: formidable.Fields; files: formidable.Files } =
//     await new Promise((resolve) =>
//       form.parse(req, (err, fields, files) => {
//         resolve({ err, fields, files });
//       })
//     );
//   if (err) {
//     console.error(err);
//     res.status(500).send("Error parsing form data");
//     return;
//   }
//   console.log("chunk processed");
//   const chunk = files.chunk;
//   const start = parseInt(fields.start as string);
//   const end = parseInt(fields.end as string);
//   const total = parseInt(fields.total as string);
//   const [mimeType] = fields.mimeType as string[];
//   const [url] = fields.url as string[];
//   console.log("Chunk:", chunk);
//   try {
//     // Upload the chunk to Google Drive
//     const uploadRequest = await uploadChunk(
//       url,
//       mimeType,
//       await fs.readFile((chunk as formidable.File[])[0].filepath),
//       start,
//       end,
//       total
//     );
//     console.log("Uploaded chunk! from", start, "to", end);
//     res.status(200).json({ success: true });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false });
//   }
// }

// @ts-ignore
const upload = multer({
  storage: multer.diskStorage({
    destination: "/tmp/uploads",
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    },
  }),
});

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  upload.single("chunk")(
    // @ts-ignore
    req,
    res,
    async (err) => {
      if (err instanceof multer.MulterError) {
        // Handle Multer errors
        return res.status(400).json({ error: err.message });
      } else if (err) {
        // Handle other errors
        return res.status(500).json({ error: err.message });
      }

      // File successfully uploaded
      // @ts-ignore
      const chunk = req.file as MulterFile;
      await uploadChunk(
        req.body.url,
        req.body.mimeType,
        await fs.readFile(chunk.path),
        parseInt(req.body.start),
        parseInt(req.body.end),
        parseInt(req.body.total)
      );
      await fs.unlink(chunk.path);
      res.status(200).json({ filename: chunk.originalname });
    }
  );
}
