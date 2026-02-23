import { env } from '../src/utils/env';

const MAX_FILE_SIZE_MB = env.uploadMaxFileSizeMb;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const hasSupabaseStorage =
	Boolean(env.supabase.url) && Boolean(env.supabase.serviceRoleKey);

export default () => ({
	upload: {
		config: {
			sizeLimit: MAX_FILE_SIZE_BYTES,
			...(hasSupabaseStorage
				? {
						// Local npm package (file: reference in package.json)
						// Node resolves it by name, no path issues
						provider: 'strapi-provider-upload-supabase',
						providerOptions: {
							supabaseUrl: env.supabase.url,
							supabaseServiceRoleKey: env.supabase.serviceRoleKey,
							bucket: env.supabase.storageBucket,
							maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
						},
					}
				: {
						provider: 'local',
						providerOptions: {},
					}),
		},
	},
});
