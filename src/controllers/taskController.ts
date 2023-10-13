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


//!GET TASK
export const getTasks = async (req: Request, res: Response) => {
  const allTasks = await prisma.task.findMany();
  res.status(200).json({ data: allTasks });
};


//!CREATE TASK
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

//! CREATE

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



//! MOVE TASK IN COLUMM OR BETWEEN

export const moveTaskInColumn = async (req: Request, res: Response) => {
  const { oldColumnId, newColumnId, tasks } = (req.body as MoveColumn) ?? {};

  if (!newColumnId || !oldColumnId) {
    return res.status(400).json({ message: 'Please provide all columns ids' });
  }

  if (newColumnId === oldColumnId) {
    await reorder(tasks, newColumnId);
  } else {
    const oldColumn = await prisma.column.findUnique({ where: { id: oldColumnId } });
    const newColumn = await prisma.column.findUnique({ where: { id: newColumnId } });

    if (!oldColumn || !newColumn) {
      return res.status(404).json({ message: 'Old or new column not found' });
    }

    const newStatus = newColumn.name;
    const shouldUpdateSubtasksStatus = newStatus === Columns.DONE;

    for (const task of tasks) {
      const taskToUpdate = await prisma.task.findUnique({
        where: { id: task.id },
        include: { subTasks: true },
      });

      if (!taskToUpdate) continue;

      const updateData = {
        position: task.position,
        columnId: newColumnId,
        status: newStatus,
      };

      // Update the task
      await prisma.task.update({
        where: { id: taskToUpdate.id },
        data: updateData,
      });

      if (shouldUpdateSubtasksStatus) {
        
        const subtaskIds = taskToUpdate.subTasks.map((subtask) => subtask.id);
        await prisma.task.updateMany({
          where: {
            id: {
              in: subtaskIds,
            },
          },
          data: {
            status: Columns.DONE,
          },
        });
      }
    }

    await reorderOldColumn(oldColumnId);
  }

  res.status(200).json({ message: 'Update position and status of all tasks and subtasks' });

  try {
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong' });
  }
};


//! REMOVE

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


//!obnovlenie statusa subtaskov

export const updateSubtaskStatus = async (req: Request, res: Response) => {
  const subtaskId = +req.params.id;
  const { newStatus, parentId } = req.body;

  if (isNaN(subtaskId) || !newStatus || typeof parentId !== 'number') {
    return res.status(400).json({ message: 'Invalid subtask ID, newStatus, or parentId' });
  }


  if (![Status.UNDONE, Status.DONE].includes(newStatus)) {
    return res.status(400).json({ message: 'Invalid newStatus value. It must be "Undone" or "Done".' });
  }

  try {
    const subtask = await prisma.task.findUnique({
      where: { id: subtaskId },
    });

    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    if (parentId !== null) {
 
      const updatedSubtask = await prisma.task.update({
        where: { id: subtaskId },
        data: { status: newStatus },
      });

      if (newStatus === Status.UNDONE) {

        const parentTask = await prisma.task.findUnique({
          where: { id: parentId },
        });

        if (parentTask && parentTask.status === Status.DONE) {

          const developmentColumn = await prisma.column.findFirst({
            where: { name: Status.DEVELOPMENT },
          });

          if (developmentColumn) {


            const aggregate = await prisma.task.aggregate({
              where: {
                column: {
                  id: developmentColumn.id
                },
              },
              _max: {
                position: true,
              },
            });
        
            const max = aggregate._max.position;
        
            await prisma.task.update({
              where: {
                id: parentId
              },
              data: {
                columnId: developmentColumn.id,
                position: typeof max !== 'number' ? 1 : max + 1,
              },
            });
          }
        }
      }

      res.status(200).json({ data: updatedSubtask });
    } else {
      res.status(400).json({ message: 'Parent ID is null. Subtasks should have a parent task.' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

