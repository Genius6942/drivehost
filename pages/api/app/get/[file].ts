import type { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";
import { downloadUserFile } from "@/lib/drive";
import { Session } from "next-auth";

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   const session = await getServerSession(req, res, authOptions);
//   if (!session || !session.user) {
//     res.status(403).send({ success: false, error: "Not authenticated" });
//     return;
//   }

//   const result = await getFile(session, req.query.file as string);

// 	res.setHeader("Content-Type", result.type);

//   res.send(Buffer.from(await result.arrayBuffer()));

// }

// export async function getFile(session: Session, id: string) {
//   const uid = session.user.id;

//   const result = await downloadUserFile(uid, id);

//   return result;
// }

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res
    .status(302)
    .redirect("https://drive.google.com/uc?id=" + req.query.file);
}
