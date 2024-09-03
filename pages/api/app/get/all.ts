import type { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import { getUserFiles } from "@/lib/drive";
import { Session } from "next-auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    res.status(403).send({ success: false, error: "Not authenticated" });
    return;
  }

  const result = await getAllFiles(session);

  res.status(200).send({
    success: true,
    data: result,
  });
}

export async function getAllFiles(session: Session) {
  const uid = session.user.id;

  const result = await getUserFiles(uid);

  return result?.map(
    ({
      name,
      mimeType,
      fileExtension,
      id,
      webContentLink,
      webViewLink,
      iconLink,
      thumbnailLink,
      size,
      fullFileExtension,
    }) => ({
      name,
      mimeType,
      extension: fileExtension,
      id,
      webContentLink,
      webViewLink,
      iconLink,
      thumbnailLink,
      size: parseInt(size as string),
      fullFileExtension,
    })
  ) as {
    name: string;
    mimeType: string;
    extension: string;
    id: string;
    size: number;
    fullFileExtension: string | null | undefined;
    webContentLink: string | null | undefined;
    webViewLink: string | null | undefined;
    iconLink: string | null | undefined;
    thumbnailLink: string | null | undefined;
  }[];
}
