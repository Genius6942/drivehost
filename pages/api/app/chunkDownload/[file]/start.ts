import type { NextApiRequest, NextApiResponse } from "next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import { getUploadUrl, startChunkedDownload } from "@/lib/drive";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  const data = await startChunkedDownload(
		req.query.file as string,
  );
  res.status(200).send({ success: true, data });
  return;
}
