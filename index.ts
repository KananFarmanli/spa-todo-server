import express, { Express } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import { boardRouter } from './src/routes/boardRoute';
import { taskRouter } from './src/routes/taskRoute';
import { columnRouter } from './src/routes/columnRoute';
import { commentRoute } from './src/routes/commentRoute';
import { prisma } from './src/db';
import fileUpload from 'express-fileupload';
import { upload } from './cloudinary';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(
  fileUpload({
    useTempFiles: true,
  })
);

app.use(express.json());

//Routes
app.use('/board', boardRouter);
app.use('/task', taskRouter);
app.use('/column', columnRouter);
app.use('/comment', commentRoute);

app.post('/upload', async (req, res) => {
  if (!req.files) return res.send('Please upload an image');

  const { image } = req.files;
  const fileTypes = ['image/jpeg', 'image/png', 'image/jpg'];

  if (Array.isArray(image)) return res.send('Please upload a single image');

  if (!fileTypes.includes(image.mimetype))
    return res.send('Image formats supported: JPG, PNG, JPEG');

  const cloudFile = await upload(image.tempFilePath);
  console.log(cloudFile);

  res.status(201).json({
    message: 'Image uploaded successfully',
    imageUrl: cloudFile.url,
  });
});

async function startServer() {
  await prisma.$connect();
  app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
  });
}

startServer().catch((e) => console.error(e));
