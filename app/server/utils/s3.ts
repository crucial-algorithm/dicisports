import type Readable from 'stream';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { Upload } from '@aws-sdk/lib-storage';

import Config from '../config.server';

const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET, AWS_REGION } =
  Config();


const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  }
});

const getS3Key = (prefix: string, filename: string) => {
  return `${prefix}/${filename}`;
};

const uploadToS3 = async (
  stream: Readable,
  prefix: string,
  filename: string
): Promise<string> =>  {
  const key = getS3Key(prefix, filename);

  await new Upload({
    client: s3Client,
    leavePartsOnError: false,
    params: {
      Bucket: AWS_S3_BUCKET,
      Key: key,
      // @ts-ignore
      Body: stream
    }
  }).done();

  return key;
};

const downloadFromS3 = async (key: string) => {
  const options = {
    Bucket: AWS_S3_BUCKET,
    Key: key
  };

  const fileStream = await s3Client.send(new GetObjectCommand(options));

  // @ts-ignore
  return fileStream?.Body;
};

export { uploadToS3, downloadFromS3 };
