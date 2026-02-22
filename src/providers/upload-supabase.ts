import { createClient } from '@supabase/supabase-js';

interface ProviderOptions {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  bucket: string;
}

interface StrapiFile {
  hash: string;
  ext: string;
  mime: string;
  buffer?: Buffer;
  stream?: AsyncIterable<Uint8Array>;
  url?: string;
  path?: string;
  size?: number;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const assertFileSize = (file: StrapiFile): void => {
  if (file.size && file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB exceeds the 10 MB limit.`,
    );
  }
};

export default {
  init(config: ProviderOptions) {
    const { supabaseUrl, supabaseServiceRoleKey, bucket } = config;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const getFilePath = (file: StrapiFile): string => {
      const prefix = file.path ? `${file.path}/` : '';
      return `${prefix}${file.hash}${file.ext}`;
    };

    const getPublicUrl = (filePath: string): string =>
      `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;

    return {
      async upload(file: StrapiFile): Promise<void> {
        assertFileSize(file);
        const filePath = getFilePath(file);

        const { error } = await supabase.storage
          .from(bucket)
          .upload(filePath, file.buffer!, {
            contentType: file.mime,
            upsert: true,
          });

        if (error) {
          throw new Error(`Supabase Storage upload failed: ${error.message}`);
        }

        file.url = getPublicUrl(filePath);
      },

      async uploadStream(file: StrapiFile): Promise<void> {
        assertFileSize(file);
        const chunks: Buffer[] = [];

        for await (const chunk of file.stream!) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }

        const buffer = Buffer.concat(chunks);

        // Double-check size after reading stream (in case size was not set)
        if (buffer.length > MAX_FILE_SIZE_BYTES) {
          throw new Error(
            `File too large: ${(buffer.length / 1024 / 1024).toFixed(1)} MB exceeds the 10 MB limit.`,
          );
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

      async delete(file: StrapiFile): Promise<void> {
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
