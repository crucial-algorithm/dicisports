import type fs from 'fs';

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';

import streamToPromise from 'stream-to-promise';

import Config from '../config.server';

const { ACCESS_KEY, SECRET_KEY, BUCKET } = Config();

const S3_BUCKET = BUCKET;

const s3Client = new S3Client({
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY
  }
});

const getS3Key = (prefix, filename) => {
  return `${prefix}/${filename}`;
};

const streamContentToS3 = async (
  stream: fs.ReadStream,
  prefix: string,
  filename: string,
  contentType: string
) => {
  const key = getS3Key(prefix, filename);

  const buffer = await streamToPromise(stream);

  const options = {
    Bucket: S3_BUCKET,
    Body: buffer,
    Key: key,
    ContentType: contentType,
    ContentDisposition: `inline; filename=${filename};`
  };

  return s3Client.send(new PutObjectCommand(options));
};

const downloadFromS3 = async (
  prefix: string,
  filename: string,
  res: Response
) => {
  const key = getS3Key(prefix, filename);

  const options = {
    Bucket: S3_BUCKET,
    Key: key
  };

  const fileStream = await s3Client.send(new GetObjectCommand(options));

  fileStream.Body.pipe(res);
};

export { streamContentToS3, downloadFromS3 };
