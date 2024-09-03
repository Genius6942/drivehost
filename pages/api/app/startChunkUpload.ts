import type { NextApiRequest, NextApiResponse } from "next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import { getUploadUrl } from "@/lib/drive";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    res.status(403).send({ success: false, error: "Not authenticated" });
    return;
  }
  const uid = session.user.id;

  if (!req.body || !req.body.name || !req.body.mimeType) {
    res.status(400).send({ success: false, error: "Missing body" });
    return;
  }

  const url = await getUploadUrl(
    session.user.id,
    req.body.name,
    req.body.mimeType,
    req.body.size
  );
  // if (!location || !location.startsWith("https://")) {
  //   res.status(500).send({ success: false, error: "Failed to start chunk upload" });
  //   console.log(location);
  //   return;
  // }
  res.status(200).send({ success: true, url });
  return;
}
