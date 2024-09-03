import { getIcon } from "material-file-icons";
import type { NextApiRequest, NextApiResponse } from "next";
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const fileName = req.query.filename

  try{
    res.status(200).setHeader('Content-Type', 'image/svg+xml').send(getIcon(fileName as string).svg);
  } catch (e) {
    console.error(e);
    res.status(500).send('An error occured');
  }
};
