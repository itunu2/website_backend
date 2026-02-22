import path from 'path';
import { env } from '../src/utils/env';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // 10 MB

const hasSupabaseStorage =
	Boolean(env.supabase.url) && Boolean(env.supabase.serviceRoleKey);

export default () => ({
	upload: {
		config: {
			sizeLimit: MAX_FILE_SIZE_BYTES,
			...(hasSupabaseStorage
				? {
						provider: path.join(__dirname, '..', 'src', 'providers', 'upload-supabase'),
						providerOptions: {
							supabaseUrl: env.supabase.url,
							supabaseServiceRoleKey: env.supabase.serviceRoleKey,
							bucket: env.supabase.storageBucket,
						},
					}
				: {
						provider: 'local',
						providerOptions: {},
					}),
		},
	},
});
