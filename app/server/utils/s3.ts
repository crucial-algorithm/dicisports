import type Readable from 'stream';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { Upload } from '@aws-sdk/lib-storage';

import Config from '../config.server';

const { AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_BUCKET } = Config();

const S3_BUCKET = AWS_BUCKET;


console.log('-->', AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_BUCKET);

const s3Client = new S3Client({
  region: 'eu-west-3',
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY
  }
});

const getS3Key = (prefix: string, filename: string) => {
  return `${prefix}/${filename}`;
};

const streamContentToS3 = async (
  stream: Readable,
  prefix: string,
  filename: string
): Promise<string> =>  {
  const key = getS3Key(prefix, filename);

  await new Upload({
    client: s3Client,
    leavePartsOnError: false,
    params: {
      Bucket: S3_BUCKET,
      Key: key,
      // @ts-ignore
      Body: stream
    }
  }).done();

  return key;
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

  console.log(fileStream);

//  fileStream?.Body?.pipe(res);
};

export { streamContentToS3, downloadFromS3 };
