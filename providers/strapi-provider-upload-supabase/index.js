'use strict';

// Supabase Storage upload provider for Strapi v5.
// Uses direct REST API calls instead of the SDK to avoid JWT parsing issues
// with both legacy JWT service role keys and new sb_secret_... format keys.

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

    const storageBase = `${supabaseUrl}/storage/v1`;
    const authHeader = `Bearer ${supabaseServiceRoleKey}`;

    function getFilePath(file) {
      const prefix = file.path ? `${file.path}/` : '';
      return `${prefix}${file.hash}${file.ext}`;
    }

    function getPublicUrl(filePath) {
      return `${storageBase}/object/public/${bucket}/${filePath}`;
    }

    async function uploadBuffer(filePath, buffer, contentType) {
      const res = await fetch(`${storageBase}/object/${bucket}/${filePath}`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': contentType || 'application/octet-stream',
          'x-upsert': 'true',
        },
        body: buffer,
      });

      if (!res.ok) {
        let message = res.statusText;
        try {
          const body = await res.json();
          message = body.message || body.error || message;
        } catch (_) {
          // non-JSON body — use status text
        }
        throw new Error(`Supabase Storage upload failed (${res.status}): ${message}`);
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
      await uploadBuffer(filePath, buffer, file.mime);
      file.url = getPublicUrl(filePath);
    }

    return {
      async upload(file) {
        return uploadFile(file);
      },

      async uploadStream(file) {
        if (!file.stream || typeof file.stream[Symbol.asyncIterator] !== 'function') {
          return uploadFile(file);
        }

        assertFileSize(file, maxFileSizeBytes);

        // Collect stream into buffer — Supabase REST requires Content-Length
        const chunks = [];
        for await (const chunk of file.stream) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);

        if (buffer.length > maxFileSizeBytes) {
          const mb = (buffer.length / 1024 / 1024).toFixed(1);
          const limitMb = (maxFileSizeBytes / 1024 / 1024).toFixed(0);
          throw new Error(`File too large: ${mb} MB exceeds the ${limitMb} MB limit.`);
        }

        const filePath = getFilePath(file);
        await uploadBuffer(filePath, buffer, file.mime);
        file.url = getPublicUrl(filePath);
      },

      async delete(file) {
        const filePath = getFilePath(file);

        const res = await fetch(`${storageBase}/object/${bucket}`, {
          method: 'DELETE',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prefixes: [filePath] }),
        });

        if (!res.ok) {
          let message = res.statusText;
          try {
            const body = await res.json();
            message = body.message || body.error || message;
          } catch (_) {
            // non-JSON body — use status text
          }
          throw new Error(`Supabase Storage delete failed (${res.status}): ${message}`);
        }
      },
    };
  },
};
