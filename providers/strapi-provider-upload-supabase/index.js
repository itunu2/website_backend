'use strict';

// Supabase Storage upload provider for Strapi v5.
// Plain CommonJS — no TypeScript compilation needed, no path resolution issues.

const { createClient } = require('@supabase/supabase-js');

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function assertFileSize(file) {
  if (file.size && file.size > MAX_FILE_SIZE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new Error(`File too large: ${mb} MB exceeds the 10 MB limit.`);
  }
}

module.exports = {
  init(config) {
    const { supabaseUrl, supabaseServiceRoleKey, bucket } = config;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    function getFilePath(file) {
      const prefix = file.path ? `${file.path}/` : '';
      return `${prefix}${file.hash}${file.ext}`;
    }

    function getPublicUrl(filePath) {
      return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
    }

    return {
      async upload(file) {
        assertFileSize(file);
        const filePath = getFilePath(file);

        const { error } = await supabase.storage
          .from(bucket)
          .upload(filePath, file.buffer, {
            contentType: file.mime,
            upsert: true,
          });

        if (error) {
          throw new Error(`Supabase Storage upload failed: ${error.message}`);
        }

        file.url = getPublicUrl(filePath);
      },

      async uploadStream(file) {
        assertFileSize(file);

        const chunks = [];
        for await (const chunk of file.stream) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }

        const buffer = Buffer.concat(chunks);

        if (buffer.length > MAX_FILE_SIZE_BYTES) {
          const mb = (buffer.length / 1024 / 1024).toFixed(1);
          throw new Error(`File too large: ${mb} MB exceeds the 10 MB limit.`);
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
