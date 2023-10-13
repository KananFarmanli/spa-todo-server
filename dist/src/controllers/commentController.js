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
exports.deleteComment = exports.createComment = exports.getCommentByTaskId = void 0;
const db_1 = require("../db");
function walk(comments, parentId = null) {
    const res = [];
    const allMainComments = comments.filter((c) => c.parentId === parentId);
    if (allMainComments.length === 0)
        return res;
    for (let comment of allMainComments) {
        res.push(Object.assign(Object.assign({}, comment), { comments: walk(comments, comment.id) }));
    }
    return res;
}
const getCommentByTaskId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { taskId } = (_a = req.params) !== null && _a !== void 0 ? _a : {};
    if (!taskId)
        return res.status(400).json({ message: 'Invalid inputs' });
    try {
        const allComments = yield db_1.prisma.comment.findMany({
            where: {
                taskId: parseInt(taskId),
            },
        });
        const updatedComments = walk(allComments);
        res.send(updatedComments);
    }
    catch (error) {
        return res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.getCommentByTaskId = getCommentByTaskId;
function createCommentApi(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const newComment = yield db_1.prisma.comment.create({
            data: {
                content: body.content,
                taskId: body.taskId,
            },
        });
        return newComment;
    });
}
function createSubcommentApi(body) {
    return __awaiter(this, void 0, void 0, function* () {
        const newComment = yield db_1.prisma.comment.create({
            data: {
                content: body.content,
                taskId: body.taskId,
                parentId: body.parentId,
            },
        });
        return newComment;
    });
}
const createComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const body = (_b = req.body) !== null && _b !== void 0 ? _b : {};
    if (!body.content || !body.taskId)
        return res.status(400).json({ message: 'Invalid inputs' });
    try {
        if (body.parentId) {
            const newComment = yield createSubcommentApi(body);
            res.status(200).json({ data: newComment });
        }
        else {
            const newComment = yield createCommentApi(body);
            res.status(200).json({ data: newComment });
        }
    }
    catch (error) {
        return res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.createComment = createComment;
const deleteComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    const id = (_c = req.params) === null || _c === void 0 ? void 0 : _c.id;
    if (!id)
        return res.status(400).json({ message: 'Invalid inputs' });
    try {
        yield db_1.prisma.comment.delete({
            where: {
                id: parseInt(id),
            },
        });
        res.status(200).json({ message: 'Comment deleted' });
    }
    catch (error) {
        return res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.deleteComment = deleteComment;
