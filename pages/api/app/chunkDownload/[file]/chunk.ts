import type { NextApiRequest, NextApiResponse } from "next";
import { downloadFileChunk,  } from "@/lib/drive";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.body || !req.body.start || !req.body.end) {
    res.status(400).send({ success: false, error: "Missing body" });
    return;
  }

  const blob = await downloadFileChunk(
    req.query.file as string,
    parseInt(req.body.start),
    parseInt(req.body.end)
  );
  // if (!location || !location.startsWith("https://")) {
  //   res.status(500).send({ success: false, error: "Failed to start chunk upload" });
  //   console.log(location);
  //   return;
  // }
	res.setHeader("Content-Type", blob.type);
	const buffer = Buffer.from(await blob.arrayBuffer());
	res.status(200).send(buffer);
  return;
}
