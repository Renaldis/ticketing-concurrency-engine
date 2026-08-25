import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!endpoint || !accessKeyId || !secretAccessKey) {
  console.warn(
    '[S3 Config WARNING]: Cloudflare R2 credentials are not completely configured in .env!',
  );
}

export const s3Client = new S3Client({
  region: 'auto', // Wajib diset 'auto' untuk Cloudflare R2
  endpoint: endpoint,
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || '',
  },
});
