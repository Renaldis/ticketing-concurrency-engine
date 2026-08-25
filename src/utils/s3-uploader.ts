import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../config/s3.js';
import { AppError } from './app-error.js';
import path from 'path';

export async function uploadToR2(
  fileBuffer: Buffer,
  originalFilename: string,
  mimeType: string,
): Promise<string> {
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!bucketName || !publicUrl) {
    throw new AppError('S3 / R2 storage bucket or public URL is not configured in .env', 500);
  }

  // Buat nama file unik agar poster antar-event tidak bertabrakan nama
  const fileExt = path.extname(originalFilename);
  const uniqueKey = `events/poster-${Date.now()}${fileExt}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: uniqueKey,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  try {
    await s3Client.send(command);
    // Kembalikan URL publik absolut menuju file poster bersangkutan
    return `${publicUrl.replace(/\/$/, '')}/${uniqueKey}`;
  } catch (error: any) {
    console.error('[R2 S3 Uploader Error]:', error);
    throw new AppError('Failed to upload image to cloud storage: ' + error.message, 500);
  }
}
