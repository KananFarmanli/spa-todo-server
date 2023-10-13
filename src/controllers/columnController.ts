import { Request, Response } from 'express';
import { prisma } from '../db';

export const getColumns = async (req: Request, res: Response) => {
  const allColumns = await prisma.column.findMany();
  res.status(200).json({ data: allColumns });
};
