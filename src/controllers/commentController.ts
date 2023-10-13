import { Request, Response } from 'express';
import { prisma } from '../db';
import { Prisma } from '@prisma/client';

type FinalComments = (Prisma.CommentGetPayload<{}> & {
  comments: Prisma.CommentGetPayload<{}>[];
})[];

function walk(
  comments: Prisma.CommentGetPayload<{}>[],
  parentId: null | number = null
) {
  const res: FinalComments = [];

  const allMainComments = comments.filter((c) => c.parentId === parentId);

  if (allMainComments.length === 0) return res;

  for (let comment of allMainComments) {
    res.push({ ...comment, comments: walk(comments, comment.id) });
  }

  return res;
}

export const getCommentByTaskId = async (req: Request, res: Response) => {
  const { taskId } = req.params ?? {};

  if (!taskId) return res.status(400).json({ message: 'Invalid inputs' });

  try {
    const allComments = await prisma.comment.findMany({
      where: {
        taskId: parseInt(taskId),
      },
    });

    const updatedComments = walk(allComments);
    res.send(updatedComments);
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

type CommentProps = {
  taskId: number;
  content: string;
  parentId: number | null;
};

async function createCommentApi(body: CommentProps) {
  const newComment = await prisma.comment.create({
    data: {
      content: body.content,
      taskId: body.taskId,
    },
  });

  return newComment;
}
async function createSubcommentApi(body: CommentProps) {
  const newComment = await prisma.comment.create({
    data: {
      content: body.content,
      taskId: body.taskId,
      parentId: body.parentId,
    },
  });

  return newComment;
}

export const createComment = async (req: Request, res: Response) => {
  const body = (req.body as CommentProps) ?? {};

  if (!body.content || !body.taskId)
    return res.status(400).json({ message: 'Invalid inputs' });

  try {
    if (body.parentId) {
      const newComment = await createSubcommentApi(body);
      res.status(200).json({ data: newComment });
    } else {
      const newComment = await createCommentApi(body);
      res.status(200).json({ data: newComment });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  const id = req.params?.id;

  if (!id) return res.status(400).json({ message: 'Invalid inputs' });

  try {
    await prisma.comment.delete({
      where: {
        id: parseInt(id),
      },
    });

    res.status(200).json({ message: 'Comment deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong' });
  }
};
