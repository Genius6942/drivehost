import type { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import { deleteUserAllFiles } from "@/lib/drive";
import { Session } from "next-auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    res.status(403).send({ success: false, error: "Not authenticated" });
    return;
  }

  const result = await deleteFiles(session);

  res.status(200).send({
    success: true,
    data: result,
  });
}

export async function deleteFiles(session: Session) {
  const uid = session.user.id;

  const result = await deleteUserAllFiles(uid);
	return result
}
