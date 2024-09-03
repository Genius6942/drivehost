import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import { uploadUserFile } from "@/lib/drive";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    res.status(403).send({ success: false, error: "Not authenticated" });
    return;
  }
  console.log("recived");
  const uid = session.user.id;

  const form = formidable({
    multiples: true,
    maxFileSize: 10 * 1024 * 1024 * 1024,
    maxFiles: 1,
  });

  const {
    err,
    fields,
    files,
  }: { err: any; fields: formidable.Fields; files: formidable.Files } =
    await new Promise((resolve) =>
      form.parse(req, (err, fields, files) => {
        resolve({ err, fields, files });
      })
    );
  if (err) {
    console.error("Error", err);
    res.status(500).send({ success: false, error: err });
    return;
  }

  const [file] = files.file as formidable.File[];

  const fileName = file.originalFilename;

  const path = file.filepath;

  const result = await uploadUserFile(
    uid,
    fileName || path.split("/").at(-1) || path,
    path,
    file.mimetype || "text/plain"
  );

  res.status(200).send({ success: true, result });
  return;
}

export const config = {
  api: {
    bodyParser: false,
  },
};
