export default ({ env }) => {
	// Configuration conditionnelle : Cloudinary en production, local en dev
	const hasCloudinary = env('CLOUDINARY_URL') || 
		(env('CLOUDINARY_NAME') && env('CLOUDINARY_KEY') && env('CLOUDINARY_SECRET'));
	
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
				provider: 'cloudinary',
				providerOptions: env('CLOUDINARY_URL') ? {} : {
					cloud_name: env('CLOUDINARY_NAME'),
					api_key: env('CLOUDINARY_KEY'),
					api_secret: env('CLOUDINARY_SECRET'),
				},
				actionOptions: {
					upload: {
						folder: env('CLOUDINARY_FOLDER'),
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
