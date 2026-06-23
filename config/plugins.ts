import { env } from '../src/utils/env';

const MAX_FILE_SIZE_MB = env.uploadMaxFileSizeMb;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const hasSupabaseStorage =
	Boolean(env.supabase.s3Endpoint) &&
	Boolean(env.supabase.s3Region) &&
	Boolean(env.supabase.s3AccessKeyId) &&
	Boolean(env.supabase.s3SecretAccessKey) &&
	Boolean(env.supabase.url);

export default () => ({
	upload: {
		config: {
			sizeLimit: MAX_FILE_SIZE_BYTES,
			// Generate responsive image variants automatically via sharp.
			// Strapi picks the nearest breakpoint; the front-end requests the
			// right size via Next.js <Image> srcSet.
			breakpoints: {
				xlarge: 1920,
				large: 1000,
				medium: 750,
				small: 500,
				xsmall: 64,
			},
			...(hasSupabaseStorage
				? {
						// Local npm package (file: reference in package.json)
						// Node resolves it by name, no path issues
						provider: 'strapi-provider-upload-supabase',
						providerOptions: {
							s3Endpoint: env.supabase.s3Endpoint,
							s3Region: env.supabase.s3Region,
							s3AccessKeyId: env.supabase.s3AccessKeyId,
							s3SecretAccessKey: env.supabase.s3SecretAccessKey,
							publicUrlBase: env.supabase.url,
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
