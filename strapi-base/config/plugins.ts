export default ({ env }) => {
	// Configuration conditionnelle : Cloudinary en production, local en dev
	const hasCloudinary = env('CLOUDINARY_URL') || 
		(env('CLOUDINARY_NAME') && env('CLOUDINARY_KEY') && env('CLOUDINARY_SECRET'));
	const cloudinaryFolder = env('CLOUDINARY_FOLDER', 'la-montre-de-mon-grand-pere');
	const uploadProcessingConcurrency = env.int('STRAPI_UPLOAD_PROCESSING_CONCURRENCY', 1);
	const concurrentUploadSize = env.int('STRAPI_CONCURRENT_UPLOAD_SIZE', 1);
	
	const config: any = {
		// Configuration i18n obligatoire
		i18n: {
			enabled: true,
			config: {
				defaultLocale: 'fr',
				locales: ['fr', 'en', 'it'],
			},
		},
	};
	
	if (hasCloudinary) {
		config.upload = {
			config: {
				// 30 MB default. Railway proxy timeout is ~120s — keep concurrency=1 to stay within it.
				// Override via STRAPI_UPLOAD_SIZE_LIMIT_BYTES env var if needed.
				sizeLimit: env.int('STRAPI_UPLOAD_SIZE_LIMIT_BYTES', 30 * 1024 * 1024),
				sharp: {
					cache: false,
					concurrency: uploadProcessingConcurrency,
				},
				concurrentUploadSize,
				provider: 'cloudinary',
				providerOptions: env('CLOUDINARY_URL') ? {} : {
					cloud_name: env('CLOUDINARY_NAME'),
					api_key: env('CLOUDINARY_KEY'),
					api_secret: env('CLOUDINARY_SECRET'),
				},
				actionOptions: {
					upload: {
						folder: cloudinaryFolder,
						resource_type: 'auto',
						access_mode: 'public',
					},
					delete: {},
				},
			},
		};
	}
	
	return config;
};
