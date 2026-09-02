import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({});
const BANNERS_BUCKET = process.env.BANNERS_BUCKET || 'indie-feedback-banners';

export const handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { mimeType, fileName } = body;

    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!mimeType || !allowedMimeTypes.includes(mimeType.toLowerCase())) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Formato de imagem inválido. Use PNG, JPEG ou WebP.' }),
      };
    }

    const key = `banners/${Date.now()}_${fileName || 'banner.png'}`;
    const command = new PutObjectCommand({
      Bucket: BANNERS_BUCKET,
      Key: key,
      ContentType: mimeType,
    });

    // 15 minutes expiration for pre-signed upload URL
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    const publicUrl = `https://${BANNERS_BUCKET}.s3.amazonaws.com/${key}`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        uploadUrl,
        publicUrl,
        key,
      }),
    };
  } catch (error) {
    console.error('Error in UploadUrlHandler:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message }),
    };
  }
};
