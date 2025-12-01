import { env } from '../src/utils/env';

const hasS3Config =
	Boolean(env.aws.accessKeyId) &&
	Boolean(env.aws.secretAccessKey) &&
	Boolean(env.aws.bucket) &&
	Boolean(env.aws.region);

export default () => ({
	upload: {
		config: hasS3Config
			? {
					provider: '@strapi/provider-upload-aws-s3',
					providerOptions: {
						s3Options: {
							accessKeyId: env.aws.accessKeyId,
							secretAccessKey: env.aws.secretAccessKey,
							region: env.aws.region,
							params: {
								Bucket: env.aws.bucket,
								ACL: env.aws.acl,
							},
						},
					},
					actionOptions: {
						upload: {
							ACL: env.aws.acl,
							CacheControl: 'public, max-age=31536000',
						},
						uploadStream: {
							ACL: env.aws.acl,
							CacheControl: 'public, max-age=31536000',
						},
						delete: {},
					},
				}
			: {
					provider: 'local',
					providerOptions: {},
				},
	},
});
