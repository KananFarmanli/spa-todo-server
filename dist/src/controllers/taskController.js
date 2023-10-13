"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSubtaskStatus = exports.updateStatus = exports.removeTask = exports.moveTaskInColumn = exports.createSubTask = exports.createTask = exports.getTasks = void 0;
const db_1 = require("../db");
var Columns;
(function (Columns) {
    Columns["QUEUE"] = "Queue";
    Columns["DEVELOPMENT"] = "Development";
    Columns["DONE"] = "Done";
})(Columns || (Columns = {}));
var Status;
(function (Status) {
    Status["QUEUE"] = "Queue";
    Status["DEVELOPMENT"] = "Development";
    Status["DONE"] = "Done";
    Status["UNDONE"] = "Undone";
})(Status || (Status = {}));
const allowToUpate = ['name', 'description', 'priority'];
//!GET TASK
const getTasks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const allTasks = yield db_1.prisma.task.findMany();
    res.status(200).json({ data: allTasks });
});
exports.getTasks = getTasks;
//!CREATE TASK
const createTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { name, columnId } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
    if (!name || !columnId)
        return res.status(404).json({ message: 'Missing some fields' });
    try {
        const column = yield db_1.prisma.column.findUnique({
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
        const newTask = yield db_1.prisma.task.create({
            data: {
                name: name,
                columnId: columnId,
                status: Status.QUEUE,
                subTasks: { create: [] },
            },
        });
        res.status(201).json({ data: newTask });
    }
    catch (error) {
        return res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.createTask = createTask;
//! CREATE
const createSubTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const { name } = (_b = req.body) !== null && _b !== void 0 ? _b : {};
    const { parentId } = req.params;
    console.log(parentId);
    if (!name || !parentId || isNaN(+parentId))
        return res.status(404).json({ message: 'Missing some fields' });
    try {
        const taskParent = yield db_1.prisma.task.findUnique({
            where: {
                id: +parentId,
                parentId: null,
            },
        });
        if (!taskParent)
            return res.status(400).json({ message: 'Error creating subtask' });
        const subTask = yield db_1.prisma.task.create({
            data: {
                name,
                parentId: +parentId,
                status: Status.UNDONE
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
    }
    catch (error) {
        return res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.createSubTask = createSubTask;
function reorder(tasks, columndId) {
    return __awaiter(this, void 0, void 0, function* () {
        const updates = tasks.map((task) => db_1.prisma.task.update({
            where: { id: task.id },
            data: {
                position: task.position,
                columnId: columndId,
            },
        }));
        yield Promise.all(updates);
    });
}
function reorderOldColumn(oldColumnId) {
    return __awaiter(this, void 0, void 0, function* () {
        const column = yield db_1.prisma.column.findUnique({
            where: { id: oldColumnId },
            include: {
                task: {
                    orderBy: {
                        position: 'asc',
                    },
                },
            },
        });
        if (!column)
            return;
        for (let i = 0; i < column.task.length; i++) {
            const taskId = column.task[i].id;
            yield db_1.prisma.task.update({
                where: { id: taskId },
                data: { position: i + 1 },
            });
        }
    });
}
//! MOVE TASK IN COLUMM OR BETWEEN
const moveTaskInColumn = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    const { oldColumnId, newColumnId, tasks } = (_c = req.body) !== null && _c !== void 0 ? _c : {};
    if (!newColumnId || !oldColumnId) {
        return res.status(400).json({ message: 'Please provide all columns ids' });
    }
    if (newColumnId === oldColumnId) {
        yield reorder(tasks, newColumnId);
    }
    else {
        const oldColumn = yield db_1.prisma.column.findUnique({ where: { id: oldColumnId } });
        const newColumn = yield db_1.prisma.column.findUnique({ where: { id: newColumnId } });
        if (!oldColumn || !newColumn) {
            return res.status(404).json({ message: 'Old or new column not found' });
        }
        const newStatus = newColumn.name;
        const shouldUpdateSubtasksStatus = newStatus === Columns.DONE;
        for (const task of tasks) {
            const taskToUpdate = yield db_1.prisma.task.findUnique({
                where: { id: task.id },
                include: { subTasks: true },
            });
            if (!taskToUpdate)
                continue;
            const updateData = {
                position: task.position,
                columnId: newColumnId,
                status: newStatus,
            };
            // Update the task
            yield db_1.prisma.task.update({
                where: { id: taskToUpdate.id },
                data: updateData,
            });
            if (shouldUpdateSubtasksStatus) {
                const subtaskIds = taskToUpdate.subTasks.map((subtask) => subtask.id);
                yield db_1.prisma.task.updateMany({
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
        yield reorderOldColumn(oldColumnId);
    }
    res.status(200).json({ message: 'Update position and status of all tasks and subtasks' });
    try {
    }
    catch (error) {
        return res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.moveTaskInColumn = moveTaskInColumn;
//! REMOVE
const removeTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    if (isNaN(+id))
        return res.status(404).json({ message: 'Missing some fields' });
    try {
        const task = yield db_1.prisma.task.deleteMany({
            where: {
                id: parseInt(id),
            },
        });
        res.status(204).json({ data: task });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.removeTask = removeTask;
const updateStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _d;
    const { id } = req.params; // task id
    const body = (_d = req.body) !== null && _d !== void 0 ? _d : {}; // column id
    if (isNaN(+id))
        return res.status(404).json({ message: 'Missing some fields' });
    try {
        const aggregate = yield db_1.prisma.task.aggregate({
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
        const updatedTask = yield db_1.prisma.task.update({
            where: {
                id: parseInt(id),
            },
            data: {
                columnId: body.columnId,
                position: typeof max !== 'number' ? 1 : max + 1,
            },
        });
        res.status(204).json({ data: updatedTask });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.updateStatus = updateStatus;
//!obnovlenie statusa subtaskov
const updateSubtaskStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const subtaskId = +req.params.id;
    const { newStatus, parentId } = req.body;
    if (isNaN(subtaskId) || !newStatus || typeof parentId !== 'number') {
        return res.status(400).json({ message: 'Invalid subtask ID, newStatus, or parentId' });
    }
    if (![Status.UNDONE, Status.DONE].includes(newStatus)) {
        return res.status(400).json({ message: 'Invalid newStatus value. It must be "Undone" or "Done".' });
    }
    try {
        const subtask = yield db_1.prisma.task.findUnique({
            where: { id: subtaskId },
        });
        if (!subtask) {
            return res.status(404).json({ message: 'Subtask not found' });
        }
        if (parentId !== null) {
            const updatedSubtask = yield db_1.prisma.task.update({
                where: { id: subtaskId },
                data: { status: newStatus },
            });
            if (newStatus === Status.UNDONE) {
                const parentTask = yield db_1.prisma.task.findUnique({
                    where: { id: parentId },
                });
                if (parentTask && parentTask.status === Status.DONE) {
                    const developmentColumn = yield db_1.prisma.column.findFirst({
                        where: { name: Status.DEVELOPMENT },
                    });
                    if (developmentColumn) {
                        const aggregate = yield db_1.prisma.task.aggregate({
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
                        yield db_1.prisma.task.update({
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
        }
        else {
            res.status(400).json({ message: 'Parent ID is null. Subtasks should have a parent task.' });
        }
    }
    catch (error) {
        return res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.updateSubtaskStatus = updateSubtaskStatus;
