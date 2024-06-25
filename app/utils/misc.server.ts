import { fileTypeFromBuffer } from 'file-type';

async function fileTypeFromUploadHandlerData(
  data: AsyncIterable<Uint8Array>
): Promise<{ type: string; buffer: Buffer } | null> {
  const chunks = [];

  for await (const chunk of data) {
    chunks.push(chunk);
  }

  // Concatenate the chunks into a single buffer
  const buffer = Buffer.concat(chunks);
  const fileType = await fileTypeFromBuffer(buffer);

  return fileType ? { type: fileType.ext, buffer } : null;
}

export { fileTypeFromUploadHandlerData };
