import { Request, Response } from 'express';
import { prisma } from '../db';

type BoardParams = {
  id: string;
};

export const getBoards = async (req: Request, res: Response) => {
  const allBoard = await prisma.board.findMany();
  res.status(200).json({ data: allBoard });
};

export const getDetailedBoard = async (
  req: Request<BoardParams>,
  res: Response
) => {
  const id = req.params.id;

  try {
    if (!id) return res.status(404).json({ message: 'Id is missing' });
    if (Number.isNaN(+id))
      return res.status(404).json({ message: 'Incorrect ID' });

    const board = await prisma.board.findUnique({
      where: {
        id: +id,
      },
      include: {
        columns: {
          include: {
            task: {
              include: {
                subTasks: true,
                comments: true,
              },
              orderBy: {
                position: 'asc',
              },
            },
          },
        },
      },
    });

    if (!board) return res.status(404).json({ message: 'Board not found' });
    res.status(200).json({ data: board });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

export const createBoard = async (req: Request, res: Response) => {
  const { name } = req.body ?? {};
  if (!name) return res.status(404).json({ message: 'Name is missing' });

  const newBoard = await prisma.board.create({
    data: {
      name,
      columns: {
        create: [{ name: 'Queue' }, { name: 'Development' }, { name: 'Done' }],
      },
    },
  });

  res.status(201).json({ data: newBoard });
};

export const deleteBoard = async (req: Request, res: Response) => {
  const id = req.params?.id;

  if (!id) return res.status(400).json({ message: 'Invalid inputs' });

  try {
    await prisma.board.delete({
      where: {
        id: parseInt(id),
      },
    });

    res.status(200).json({message: 'Board deleted'});
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong' });
  }
};



