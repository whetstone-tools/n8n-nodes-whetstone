import {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';

/** Apify actor IDs (username~actor-name) behind each operation. */
const ACTOR_IDS: { [key: string]: string } = {
	businessSearch: 'whetstonetools~secretary-of-state-business-search',
	filingsMonitor: 'whetstonetools~new-business-filings-monitor',
	watchlistScreen: 'whetstonetools~ofac-sanctions-screen',
	federalAwards: 'whetstonetools~federal-awards-lookup',
};

/** 25 KYB-supported states (must mirror the actor's input_schema enum). */
const KYB_STATES: Array<{ name: string; value: string }> = [
	{ name: 'New York', value: 'NY' }, { name: 'Colorado', value: 'CO' },
	{ name: 'Oregon', value: 'OR' }, { name: 'Connecticut', value: 'CT' },
	{ name: 'Pennsylvania', value: 'PA' }, { name: 'Texas', value: 'TX' },
	{ name: 'Florida', value: 'FL' }, { name: 'Hawaii', value: 'HI' },
	{ name: 'Virginia', value: 'VA' }, { name: 'New Mexico', value: 'NM' },
	{ name: 'Mississippi', value: 'MS' }, { name: 'District of Columbia', value: 'DC' },
	{ name: 'Idaho', value: 'ID' }, { name: 'New Jersey', value: 'NJ' },
	{ name: 'Iowa', value: 'IA' }, { name: 'Alabama', value: 'AL' },
	{ name: 'Wisconsin', value: 'WI' }, { name: 'West Virginia', value: 'WV' },
	{ name: 'Kentucky', value: 'KY' }, { name: 'Rhode Island', value: 'RI' },
	{ name: 'North Dakota', value: 'ND' }, { name: 'Arkansas', value: 'AR' },
	{ name: 'Missouri', value: 'MO' }, { name: 'Montana', value: 'MT' },
	{ name: 'Vermont', value: 'VT' },
];

/** 10 states supported by the filings monitor. */
const FILING_STATES: Array<{ name: string; value: string }> = [
	{ name: 'New York', value: 'NY' }, { name: 'Colorado', value: 'CO' },
	{ name: 'Oregon', value: 'OR' }, { name: 'Connecticut', value: 'CT' },
	{ name: 'Pennsylvania', value: 'PA' }, { name: 'Texas', value: 'TX' },
	{ name: 'District of Columbia', value: 'DC' }, { name: 'Mississippi', value: 'MS' },
	{ name: 'West Virginia', value: 'WV' }, { name: 'Florida', value: 'FL' },
];

const AWARD_TYPES: Array<{ name: string; value: string }> = [
	{ name: 'Contracts', value: 'contracts' },
	{ name: 'Grants', value: 'grants' },
	{ name: 'Loans', value: 'loans' },
	{ name: 'Direct Payments', value: 'direct_payments' },
	{ name: 'IDVs (Indefinite Delivery Vehicles)', value: 'idvs' },
	{ name: 'Other Financial Assistance', value: 'other_financial_assistance' },
];

export class WhetstonePublicRecords implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Whetstone Public Records',
		name: 'whetstonePublicRecords',
		icon: 'file:whetstone.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description:
			'Look up U.S. public-records data: business registration (KYB), new business filings, ' +
			'federal watchlist screening, and federal awards. Powered by the Whetstone actors on Apify.',
		defaults: {
			name: 'Whetstone Public Records',
		},
		// AI Agent tool support (n8n 1.x): lets an AI Agent call this node as a tool.
		usableAsTool: true,
		inputs: ['main'] as NodeConnectionType[],
		outputs: ['main'] as NodeConnectionType[],
		credentials: [
			{
				name: 'whetstoneApifyApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'businessSearch',
				options: [
					{
						name: 'Business Search (KYB)',
						value: 'businessSearch',
						description: 'Find a company\'s official Secretary of State registration across 25 states',
						action: 'Search official business registrations',
					},
					{
						name: 'New Business Filings',
						value: 'filingsMonitor',
						description: 'Pull newly registered businesses from official state sources (lead-gen / monitoring)',
						action: 'Monitor new business filings',
					},
					{
						name: 'Watchlist Screen',
						value: 'watchlistScreen',
						description: 'Screen a name against 12 U.S. government watchlists (OFAC, BIS, State Dept).',
						action: 'Screen a name against government watchlists',
					},
					{
						name: 'Federal Awards',
						value: 'federalAwards',
						description: 'Look up a company\'s federal contracts, grants, and loans (USAspending.gov)',
						action: 'Look up federal awards',
					},
				],
			},

			// ---- Business Search (KYB) ----
			{
				displayName: 'Company Name',
				name: 'companyName',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. Stripe',
				description: 'Business name (or part of it) to search for',
				displayOptions: { show: { operation: ['businessSearch'] } },
			},
			{
				displayName: 'States',
				name: 'kybStates',
				type: 'multiOptions',
				options: KYB_STATES,
				default: [],
				description: 'Which state registries to query. Leave empty to search all 25 supported states.',
				displayOptions: { show: { operation: ['businessSearch'] } },
			},
			{
				displayName: 'Exact Match',
				name: 'exactMatch',
				type: 'boolean',
				default: false,
				description: 'Whether to return only entities whose name exactly equals the query (case-insensitive)',
				displayOptions: { show: { operation: ['businessSearch'] } },
			},
			{
				displayName: 'Max Results Per State',
				name: 'kybMaxPerState',
				type: 'number',
				default: 25,
				typeOptions: { minValue: 1, maxValue: 200 },
				description: 'Cap on records returned from each state',
				displayOptions: { show: { operation: ['businessSearch'] } },
			},

			// ---- New Business Filings ----
			{
				displayName: 'States',
				name: 'filingStates',
				type: 'multiOptions',
				options: FILING_STATES,
				default: [],
				description: 'Which state sources to pull new registrations from. Leave empty for all 10 supported states.',
				displayOptions: { show: { operation: ['filingsMonitor'] } },
			},
			{
				displayName: 'Look-Back Window (Days)',
				name: 'daysBack',
				type: 'number',
				default: 7,
				typeOptions: { minValue: 1, maxValue: 90 },
				description: 'Return businesses registered within the last N days. PA publishes with a ~1-week lag, so use 10+ for PA.',
				displayOptions: { show: { operation: ['filingsMonitor'] } },
			},
			{
				displayName: 'Since Date (Overrides Look-Back)',
				name: 'sinceDate',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'Optional fixed start date. If set, returns registrations from this date forward and ignores the look-back window.',
				displayOptions: { show: { operation: ['filingsMonitor'] } },
			},
			{
				displayName: 'Max Results Per State',
				name: 'filingMaxPerState',
				type: 'number',
				default: 100,
				typeOptions: { minValue: 1, maxValue: 2000 },
				description: 'Cap on new registrations returned from each state',
				displayOptions: { show: { operation: ['filingsMonitor'] } },
			},

			// ---- Watchlist Screen ----
			{
				displayName: 'Name to Screen',
				name: 'watchName',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. Huawei Technologies',
				description: 'Person or business name to check against the U.S. Consolidated Screening List.',
				displayOptions: { show: { operation: ['watchlistScreen'] } },
			},
			{
				displayName: 'Minimum Match Score',
				name: 'minScore',
				type: 'number',
				default: 85,
				typeOptions: { minValue: 0, maxValue: 100 },
				description: 'Fuzzy-match threshold (0-100). Matches below this are suppressed. 85 balances recall vs. false positives',
				displayOptions: { show: { operation: ['watchlistScreen'] } },
			},
			{
				displayName: 'Include Aliases (AKA)',
				name: 'includeAliases',
				type: 'boolean',
				default: true,
				description: 'Whether to also match against alternate names (alt_names) on the list',
				displayOptions: { show: { operation: ['watchlistScreen'] } },
			},
			{
				displayName: 'Max Results',
				name: 'watchMaxResults',
				type: 'number',
				default: 100,
				typeOptions: { minValue: 1, maxValue: 500 },
				description: 'Cap on matching records returned',
				displayOptions: { show: { operation: ['watchlistScreen'] } },
			},
			{
				displayName: 'Filter to Lists',
				name: 'lists',
				type: 'string',
				typeOptions: { multipleValues: true },
				default: [],
				placeholder: 'e.g. SDN',
				description: 'Optional source-list name substrings to restrict screening to (e.g. SDN, Entity List). Leave empty to screen all lists.',
				displayOptions: { show: { operation: ['watchlistScreen'] } },
			},

			// ---- Federal Awards ----
			{
				displayName: 'Recipient Name',
				name: 'recipientName',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. Booz Allen Hamilton',
				description: 'Company or organization name to search in the federal awards database',
				displayOptions: { show: { operation: ['federalAwards'] } },
			},
			{
				displayName: 'Award Types',
				name: 'awardTypes',
				type: 'multiOptions',
				options: AWARD_TYPES,
				default: [],
				description: 'Which categories of federal awards to return. Leave empty for all.',
				displayOptions: { show: { operation: ['federalAwards'] } },
			},
			{
				displayName: 'Since Fiscal Year',
				name: 'sinceFiscalYear',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0, maxValue: 2030 },
				description: 'Earliest federal fiscal year to include (>= 2008). Leave 0 to use the default (5 years back).',
				displayOptions: { show: { operation: ['federalAwards'] } },
			},
			{
				displayName: 'Max Results',
				name: 'awardsMaxResults',
				type: 'number',
				default: 50,
				typeOptions: { minValue: 1, maxValue: 500 },
				description: 'Maximum total award records to return',
				displayOptions: { show: { operation: ['federalAwards'] } },
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const actorId = ACTOR_IDS[operation];
				if (!actorId) {
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, {
						itemIndex: i,
					});
				}

				// Build the actor input from the operation's parameters.
				let actorInput: IDataObject = {};

				if (operation === 'businessSearch') {
					actorInput = {
						companyName: this.getNodeParameter('companyName', i) as string,
						states: this.getNodeParameter('kybStates', i, []) as string[],
						exactMatch: this.getNodeParameter('exactMatch', i, false) as boolean,
						maxResultsPerState: this.getNodeParameter('kybMaxPerState', i, 25) as number,
					};
				} else if (operation === 'filingsMonitor') {
					actorInput = {
						states: this.getNodeParameter('filingStates', i, []) as string[],
						daysBack: this.getNodeParameter('daysBack', i, 7) as number,
						maxResultsPerState: this.getNodeParameter('filingMaxPerState', i, 100) as number,
					};
					const sinceDate = (this.getNodeParameter('sinceDate', i, '') as string).trim();
					if (sinceDate) actorInput.sinceDate = sinceDate;
				} else if (operation === 'watchlistScreen') {
					actorInput = {
						name: this.getNodeParameter('watchName', i) as string,
						minScore: this.getNodeParameter('minScore', i, 85) as number,
						includeAliases: this.getNodeParameter('includeAliases', i, true) as boolean,
						maxResults: this.getNodeParameter('watchMaxResults', i, 100) as number,
						lists: this.getNodeParameter('lists', i, []) as string[],
					};
				} else if (operation === 'federalAwards') {
					actorInput = {
						recipientName: this.getNodeParameter('recipientName', i) as string,
						awardTypes: this.getNodeParameter('awardTypes', i, []) as string[],
						maxResults: this.getNodeParameter('awardsMaxResults', i, 50) as number,
					};
					const fy = this.getNodeParameter('sinceFiscalYear', i, 0) as number;
					if (fy && fy >= 2008) actorInput.sinceFiscalYear = fy;
				}

				// Run the actor synchronously and get its dataset items back.
				const options: IHttpRequestOptions = {
					method: 'POST',
					url: `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items`,
					qs: { timeout: 300, format: 'json', clean: 'true' },
					body: actorInput,
					json: true,
				};

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'whetstoneApifyApi',
					options,
				)) as unknown;

				const records: unknown[] = Array.isArray(response)
					? response
					: response == null
						? []
						: [response];

				if (records.length === 0) {
					returnData.push({
						json: { matched: false, operation, input: actorInput },
						pairedItem: { item: i },
					});
				} else {
					for (const rec of records) {
						returnData.push({
							json: rec as IDataObject,
							pairedItem: { item: i },
						});
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
