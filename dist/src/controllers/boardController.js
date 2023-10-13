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
exports.deleteBoard = exports.createBoard = exports.getDetailedBoard = exports.getBoards = void 0;
const db_1 = require("../db");
const getBoards = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const allBoard = yield db_1.prisma.board.findMany();
    res.status(200).json({ data: allBoard });
});
exports.getBoards = getBoards;
const getDetailedBoard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    try {
        if (!id)
            return res.status(404).json({ message: 'Id is missing' });
        if (Number.isNaN(+id))
            return res.status(404).json({ message: 'Incorrect ID' });
        const board = yield db_1.prisma.board.findUnique({
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
        if (!board)
            return res.status(404).json({ message: 'Board not found' });
        res.status(200).json({ data: board });
    }
    catch (error) {
        return res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.getDetailedBoard = getDetailedBoard;
const createBoard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { name } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
    if (!name)
        return res.status(404).json({ message: 'Name is missing' });
    const newBoard = yield db_1.prisma.board.create({
        data: {
            name,
            columns: {
                create: [{ name: 'Queue' }, { name: 'Development' }, { name: 'Done' }],
            },
        },
    });
    res.status(201).json({ data: newBoard });
});
exports.createBoard = createBoard;
const deleteBoard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const id = (_b = req.params) === null || _b === void 0 ? void 0 : _b.id;
    if (!id)
        return res.status(400).json({ message: 'Invalid inputs' });
    try {
        yield db_1.prisma.board.delete({
            where: {
                id: parseInt(id),
            },
        });
        res.status(200).json({ message: 'Board deleted' });
    }
    catch (error) {
        return res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.deleteBoard = deleteBoard;
