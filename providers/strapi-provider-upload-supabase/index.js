'use strict';

// Supabase Storage upload provider for Strapi v5.
//
// Uses Supabase's S3-compatible protocol (AWS SigV4) with dedicated S3 access
// keys — NOT the anon/service_role/sb_secret API keys. This is the officially
// recommended credential for full server-side storage access and is completely
// independent of the legacy-JWT -> new-API-key migration: S3 access keys do not
// expire with the end-of-2026 legacy key deprecation, and authentication never
// touches the API gateway's JWT minting (which is what failed with the opaque
// sb_secret_ key in "direct" gateway mode).

const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function assertFileSize(file, maxFileSizeBytes) {
  if (file.size && file.size > maxFileSizeBytes) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    const limitMb = (maxFileSizeBytes / 1024 / 1024).toFixed(0);
    throw new Error(`File too large: ${mb} MB exceeds the ${limitMb} MB limit.`);
  }
}

async function toBuffer(file) {
  if (Buffer.isBuffer(file.buffer)) {
    return file.buffer;
  }

  if (file.stream && typeof file.stream[Symbol.asyncIterator] === 'function') {
    const chunks = [];
    for await (const chunk of file.stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  throw new Error('Upload payload is empty or unreadable.');
}

module.exports = {
  init(config) {
    const {
      s3Endpoint,
      s3Region,
      s3AccessKeyId,
      s3SecretAccessKey,
      publicUrlBase,
      bucket,
    } = config;

    const maxFileSizeBytes = Number.isFinite(config.maxFileSizeBytes)
      ? Number(config.maxFileSizeBytes)
      : MAX_FILE_SIZE_BYTES;

    const client = new S3Client({
      forcePathStyle: true,
      region: s3Region,
      endpoint: s3Endpoint,
      credentials: {
        accessKeyId: s3AccessKeyId,
        secretAccessKey: s3SecretAccessKey,
      },
    });

    function getFilePath(file) {
      const prefix = file.path ? `${file.path}/` : '';
      return `${prefix}${file.hash}${file.ext}`;
    }

    function getPublicUrl(filePath) {
      // publicUrlBase is the project URL, e.g. https://<ref>.supabase.co
      return `${publicUrlBase}/storage/v1/object/public/${bucket}/${filePath}`;
    }

    async function putObject(filePath, buffer, contentType) {
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: filePath,
            Body: buffer,
            ContentType: contentType || 'application/octet-stream',
          })
        );
      } catch (error) {
        const detail = error && error.message ? error.message : String(error);
        throw new Error(`Supabase Storage upload failed: ${detail}`);
      }
    }

    async function uploadFile(file) {
      assertFileSize(file, maxFileSizeBytes);
      const buffer = await toBuffer(file);

      if (buffer.length > maxFileSizeBytes) {
        const mb = (buffer.length / 1024 / 1024).toFixed(1);
        const limitMb = (maxFileSizeBytes / 1024 / 1024).toFixed(0);
        throw new Error(`File too large: ${mb} MB exceeds the ${limitMb} MB limit.`);
      }

      const filePath = getFilePath(file);
      await putObject(filePath, buffer, file.mime);
      file.url = getPublicUrl(filePath);
    }

    return {
      async upload(file) {
        return uploadFile(file);
      },

      // S3 PutObject requires a known Content-Length, so we buffer the stream.
      async uploadStream(file) {
        return uploadFile(file);
      },

      async delete(file) {
        const filePath = getFilePath(file);
        try {
          await client.send(
            new DeleteObjectCommand({
              Bucket: bucket,
              Key: filePath,
            })
          );
        } catch (error) {
          const detail = error && error.message ? error.message : String(error);
          throw new Error(`Supabase Storage delete failed: ${detail}`);
        }
      },
    };
  },
};
