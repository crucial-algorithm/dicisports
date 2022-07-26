import type { UploadApiResponse } from 'cloudinary';
import { v2 as cloudinary } from 'cloudinary';

import { setConfig } from 'cloudinary-build-url';

import { writeAsyncIterableToWritable } from '@remix-run/node';

import Id from '~/server/utils/Id.server';
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

const uploadPreset = CLOUDINARY_UPLOAD_PRESET;

cloudinary.config(config);

const generateCloudinarySignature = (publicId: string) => {
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp: timestamp,
      upload_preset: uploadPreset,
      public_id: publicId
    },
    config.api_secret || ''
  );

  return { timestamp, signature };
};

export type CloudinaryFileMeta = {
  publicId: string
  timestamp: number
  signature: string
  apiKey: string
}

const generateCloudinarySignatures = (
  nbr: number
): Array<CloudinaryFileMeta> => {
  const result = [];

  for (let i = 0; i < nbr; i++) {
    const publicId = Id();

    result.push({
      publicId,
      apiKey: config.api_key || '',
      ...generateCloudinarySignature(publicId)
    });
  }
  return result;
};

async function uploadImageToCloudinary(data: AsyncIterable<Uint8Array>) {
  return new Promise<UploadApiResponse>(async (resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'remix'
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

export { generateCloudinarySignature, generateCloudinarySignatures };
