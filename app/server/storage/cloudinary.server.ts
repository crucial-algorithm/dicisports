import type { UploadApiResponse } from 'cloudinary';
import { v2 as cloudinary } from 'cloudinary';

import { setConfig } from 'cloudinary-build-url';

import { writeAsyncIterableToWritable } from '@remix-run/node';

import Config from '~/server/config.server';

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_UPLOAD_PRESET
} = Config();

setConfig({
  cloudName: CLOUDINARY_CLOUD_NAME
});

const config = {
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET
};

cloudinary.config(config);

async function uploadImageToCloudinary(data: AsyncIterable<Uint8Array>) {
  return new Promise<UploadApiResponse>(async (resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        upload_preset: CLOUDINARY_UPLOAD_PRESET
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result as UploadApiResponse);
      }
    );

    await writeAsyncIterableToWritable(data, uploadStream);
  });
}

export { uploadImageToCloudinary };
