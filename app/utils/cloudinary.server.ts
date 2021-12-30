import { v2 as cloudinary } from 'cloudinary'
import Random from '~/utils/random.server'

const config = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
}

const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET

cloudinary.config(config)

const generateCloudinarySignature = (publicId: string) => {
  const timestamp = Math.round(Date.now() / 1000)
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp: timestamp,
      upload_preset: uploadPreset,
      public_id: publicId
    },
    config.api_secret || ''
  )

  return { timestamp, signature }
}

export type CloudinaryFileMeta = {
  publicId: string
  timestamp: number
  signature: string
  apiKey: string
}

const generateCloudinarySignatures = (
  nbr: number
): Array<CloudinaryFileMeta> => {
  const result = []
  for (let i = 0; i < nbr; i++) {
    const publicId = Random.id()
    result.push({
      publicId,
      apiKey: config.api_key || '',
      ...generateCloudinarySignature(publicId)
    })
  }
  return result
}

export { generateCloudinarySignature, generateCloudinarySignatures }
