import { v2 as cloudinary } from 'cloudinary';

import dotenv from 'dotenv';

dotenv.config();

console.log('hello');

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const upload = async (file: string) => {
  const image = await cloudinary.uploader.upload(
    file,
    (result) => result
  );
  return image;
};

export { upload };
//chekt it