import { Request, Response } from 'express';
import { prisma } from '../db';
import { Prisma } from '@prisma/client';

enum Columns {
  QUEUE = 'Queue',
  DEVELOPMENT = 'Development',
  DONE = 'Done',
}

enum Status {
  QUEUE = 'Queue',
  DEVELOPMENT = 'Development',
  DONE = 'Done',
  UNDONE = 'Undone'
}


const allowToUpate = ['name', 'description', 'priority'];

type PostCreateBody = Prisma.Args<typeof prisma.task, 'create'>['data'];

export const getTasks = async (req: Request, res: Response) => {
  const allTasks = await prisma.task.findMany();
  res.status(200).json({ data: allTasks });
};

export const createTask = async (req: Request, res: Response) => {
  const { name, columnId } = (req.body as PostCreateBody) ?? {};

  if (!name || !columnId)
    return res.status(404).json({ message: 'Missing some fields' });

  try {
    const column = await prisma.column.findUnique({
      where: {
        id: columnId,
        name: Columns.QUEUE,
      },
    });

    console.log({ column });

    if (!column)
      return res
        .status(404)
        .json({ message: 'You can create task only in QUEUE' });

    const newTask = await prisma.task.create({
      data: {
        name: name,
        columnId: columnId,
        status: Status.QUEUE,
    
      },
    });

    res.status(201).json({ data: newTask });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

export const createSubTask = async (req: Request, res: Response) => {
  const { name } = (req.body as PostCreateBody) ?? {};

  const { parentId } = req.params;
  console.log(parentId);

  if (!name || !parentId || isNaN(+parentId))
    return res.status(404).json({ message: 'Missing some fields' });

  try {
    const taskParent = await prisma.task.findUnique({
      where: {
        id: +parentId,
        parentId: null,
      },
    });

    if (!taskParent)
      return res.status(400).json({ message: 'Error creating subtask' });

    const subTask = await prisma.task.create({
      data: {
        name,
        parentId: +parentId,
        status:Status.UNDONE
      },
      include: {
        subTasks: true,
      },
    });

    res.status(201).json({
      data: {
        subTask: subTask,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  const body = req.body;
  const param = req.params as { id: string };

  const newBody = allowToUpate.reduce<any>((obj, current) => {
    if (body[current]) {
      return { ...obj, [current]: body[current] };
    } else {
      return obj;
    }
  }, {});

  if (!param || !newBody)
    return res.status(400).json({ message: 'Wrong input' });

  if (isNaN(Number(param.id))) return res.status(400);

  try {
    const updatedTask = await prisma.task.update({
      where: {
        id: +param.id,
      },
      data: newBody,
    });

    res.status(201).json({ data: updatedTask });
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

type ReorderedItems = {
  id: number;
  position: number;
};

type MoveColumn = {
  oldColumnId: number;
  newColumnId: number;
  tasks: ReorderedItems[];
};

async function reorder(tasks: ReorderedItems[], columndId: number) {
  const updates = tasks.map((task) =>
    prisma.task.update({
      where: { id: task.id },
      data: {
        position: task.position,
        columnId: columndId,
      },
    })
  );

  await Promise.all(updates);
}

async function reorderOldColumn(oldColumnId: number) {
  const column = await prisma.column.findUnique({
    where: { id: oldColumnId },
    include: {
      task: {
        orderBy: {
          position: 'asc',
        },
      },
    },
  });

  if (!column) return;

  for (let i = 0; i < column.task.length; i++) {
    const taskId = column.task[i].id;

    await prisma.task.update({
      where: { id: taskId },
      data: { position: i + 1 },
    });
  }
}

export const moveColumn = async (req: Request, res: Response) => {
  const { oldColumnId, newColumnId, tasks } = (req.body as MoveColumn) ?? {};

  if (!newColumnId || !oldColumnId) {
    return res.status(400).json({ message: 'Please provide all columns ids' });
  }

  if (newColumnId === oldColumnId) {
    await reorder(tasks, newColumnId);
  } else {
    await reorder(tasks, newColumnId);
    await reorderOldColumn(oldColumnId);
  }

  res.status(200).json({ message: 'Update position of all tasks' });

  try {
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

export const removeTask = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (isNaN(+id))
    return res.status(404).json({ message: 'Missing some fields' });

  try {
    const task = await prisma.task.deleteMany({
      where: {
        id: parseInt(id),
      },
    });

    res.status(204).json({ data: task });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

export const updateStatus = async (req: Request, res: Response) => {
  const { id } = req.params; // task id
  const body = (req.body as { columnId: number }) ?? {}; // column id

  if (isNaN(+id))
    return res.status(404).json({ message: 'Missing some fields' });

  try {
    const aggregate = await prisma.task.aggregate({
      where: {
        column: {
          id: body.columnId,
        },
      },
      _max: {
        position: true,
      },
    });

    const max = aggregate._max.position;

    const updatedTask = await prisma.task.update({
      where: {
        id: parseInt(id),
      },
      data: {
        columnId: body.columnId,
        position: typeof max !== 'number' ? 1 : max + 1,
      },
    });

    res.status(204).json({ data: updatedTask });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};


