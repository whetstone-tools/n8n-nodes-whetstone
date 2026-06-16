import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Whetstone operations run as actors on the Apify platform, so the only
 * credential needed is an Apify API token. It is sent as a Bearer token and
 * validated against Apify's /users/me endpoint.
 */
export class WhetstoneApifyApi implements ICredentialType {
	name = 'whetstoneApifyApi';

	displayName = 'Whetstone (Apify) API';

	documentationUrl = 'https://whetstonetools.com/company-check/';

	properties: INodeProperties[] = [
		{
			displayName: 'Apify API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Your Apify API token (apify.com → Settings → API & Integrations → Personal API tokens). ' +
				'The Whetstone operations run the matching Whetstone actor under your Apify account and are ' +
				'billed per Apify pay-per-result pricing. A free Apify account works.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.apify.com/v2',
			url: '/users/me',
		},
	};
}
