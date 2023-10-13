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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const boardRoute_1 = require("./src/routes/boardRoute");
const taskRoute_1 = require("./src/routes/taskRoute");
const columnRoute_1 = require("./src/routes/columnRoute");
const commentRoute_1 = require("./src/routes/commentRoute");
const db_1 = require("./src/db");
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const cloudinary_1 = require("./cloudinary");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 8080;
app.use((0, cors_1.default)());
app.use((0, express_fileupload_1.default)({
    useTempFiles: true,
}));
app.use(express_1.default.json());
//Routes
app.use('/board', boardRoute_1.boardRouter);
app.use('/task', taskRoute_1.taskRouter);
app.use('/column', columnRoute_1.columnRouter);
app.use('/comment', commentRoute_1.commentRoute);
app.post('/upload', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.files)
        return res.send('Please upload an image');
    const { image } = req.files;
    const fileTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (Array.isArray(image))
        return res.send('Please upload a single image');
    if (!fileTypes.includes(image.mimetype))
        return res.send('Image formats supported: JPG, PNG, JPEG');
    const cloudFile = yield (0, cloudinary_1.upload)(image.tempFilePath);
    console.log(cloudFile);
    res.status(201).json({
        message: 'Image uploaded successfully',
        imageUrl: cloudFile.url,
    });
}));
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        yield db_1.prisma.$connect();
        app.listen(port, () => {
            console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
        });
    });
}
startServer().catch((e) => console.error(e));
