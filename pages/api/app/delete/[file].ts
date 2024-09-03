import type { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import { deleteUserFile } from "@/lib/drive";
import { Session } from "next-auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    res.status(403).send({ success: false, error: "Not authenticated" });
    return;
  }

  const result = await deleteFile(session, req.query.file as string);

  if (result) {
    res.send({ success: true });
  } else {
    res.send({ success: false, error: "File not found" });
  }
}

export async function deleteFile(session: Session, id: string) {
  const uid = session.user.id;

  const result = await deleteUserFile(uid, id);

  return result;
}
