'use strict';

// Supabase Storage upload provider for Strapi v5.
// Plain CommonJS — no TypeScript compilation needed, no path resolution issues.

const { createClient } = require('@supabase/supabase-js');

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
    const { supabaseUrl, supabaseServiceRoleKey, bucket } = config;
    const maxFileSizeBytes = Number.isFinite(config.maxFileSizeBytes)
      ? Number(config.maxFileSizeBytes)
      : MAX_FILE_SIZE_BYTES;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    function getFilePath(file) {
      const prefix = file.path ? `${file.path}/` : '';
      return `${prefix}${file.hash}${file.ext}`;
    }

    function getPublicUrl(filePath) {
      return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
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

      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, buffer, {
          contentType: file.mime,
          upsert: true,
        });

      if (error) {
        throw new Error(`Supabase Storage upload failed: ${error.message}`);
      }

      file.url = getPublicUrl(filePath);
    }

    return {
      async upload(file) {
        return uploadFile(file);
      },

      async uploadStream(file) {
        return uploadFile(file);
      },

      async delete(file) {
        const filePath = getFilePath(file);

        const { error } = await supabase.storage
          .from(bucket)
          .remove([filePath]);

        if (error) {
          throw new Error(`Supabase Storage delete failed: ${error.message}`);
        }
      },
    };
  },
};
