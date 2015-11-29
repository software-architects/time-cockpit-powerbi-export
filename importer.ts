/// <reference path="typings/tsd.d.ts" />
import * as needle from "needle";
import * as async from "async";
import * as chalk from "chalk";

export module powerBiImporter {
	// Get parameters from environment variables
	var tenant = process.env.AZURE_AD_TENANT;
	var clientId = process.env.AZURE_AD_APP_ID;
	var clientSecret = process.env.AZURE_AD_APP_SECRET;
	var powerBiUser = process.env.POWERBI_USER;
	var powerBiPassword = process.env.POWERBI_PASSWORD;
	var tcUser = process.env.TC_USER;
	var tcPassword = process.env.TC_PASSWORD;

	// Some helper interfaces
	interface ExtendedHttpHeaderOptions extends Needle.HttpHeaderOptions {
		"Content-Type"?: string,
		Authorization?: string
	}

	interface IPowerBIDataset {
		id: string;
		name: string;
	}

	interface IImportContext {
		powerBiHeader?: ExtendedHttpHeaderOptions;
		tcHeader?: ExtendedHttpHeaderOptions;
		tcData?: any[];
		datasetId?: string;
	}

	function processResponse(resp: any, step: string, resultExtractor: () => any,
		callback: (err?: Error, result?: any) => void, expectedStatus: number = 200) {
		if (resp.statusCode !== expectedStatus) {
			var msg = `FAILURE DURING STEP ${step}`;
				console.log(chalk.bgRed.white(msg));
				if (resp) {
					console.log(chalk.red(`HTTP Status Code: ${resp.statusCode}`));
				if (resp.body) {
					console.log(chalk.red(`Response Body: ${JSON.stringify(resp.body) }`));
				}
			}

			callback({ name: "Error", message: msg });
		} else {
			console.log(chalk.green(`Step ${step} succeeded.`));
			callback(null, resultExtractor());
		}
	}

	function findDatasetByName(datasets: IPowerBIDataset[], name: string): string {
		for (var i = 0; i < datasets.length; i++) {
			if (datasets[i].name === name) {
				return datasets[i].id;
			}
		}

		return null;
	}

	export interface IColumnSchema {
		name: string;
		dataType: string;
	}

	export interface ITable {
		name: string;
		columns: IColumnSchema[];
	}

	export interface IDataset {
		name: string;
		tables: ITable[];
	}

	export interface IDatasetDefinition {
		tcqlQuery: string;
		dataset: IDataset;
	}

	export function importData(datasetDefinition: IDatasetDefinition): void {
		async.waterfall([
			(wfCallback: any) => 
				// Get tokens from Azure AD and time cockpit in parallel
				async.parallel([
					pCallback => needle.post(
						`https://login.microsoftonline.com/${tenant}/oauth2/token`,
						`grant_type=password&username=${powerBiUser}&password=${powerBiPassword}&client_id=${clientId}&client_secret=${clientSecret}&resource=https%3A%2F%2Fanalysis.windows.net%2Fpowerbi%2Fapi`,
						(_, resp, __) => processResponse(resp, "Get token from Azure AD", () => resp.body.access_token, pCallback)),
					pCallback => needle.get(
						"https://apipreview.timecockpit.com/token",
						{ username: tcUser, password: tcPassword, auth: "Basic" },
						(_, resp, __) => processResponse(resp, "Get token from time cockpit", () => resp.body, pCallback)),
				], wfCallback),
			(tokens: string[], wfCallback: any) => {
				// Build context object used to store state throughout the import process
				var context: IImportContext = {
					powerBiHeader: {
						accept: "application/json",
						Authorization: "Bearer " + tokens[0],
						"Content-Type": "application/json"
					},
					tcHeader: {
						accept: "application/json",
						Authorization: "Bearer " + tokens[1],
						"Content-Type": "application/json"
					}
				};
				wfCallback(null, context);
			},
			(context: IImportContext, wfCallback: any) =>
				// Get data from time cockpit using TCQL
				needle.post(
					"https://apipreview.timecockpit.com/select",
					{ query: datasetDefinition.tcqlQuery },
					{ headers: context.tcHeader, json: true },
					(_, resp, __) => processResponse(resp, "Get data from time cockpit",
						() => { context.tcData = resp.body.value; return context; }, wfCallback)),
			(context: IImportContext, wfCallback: any) =>
				// Check if target dataset exists in Power BI
				needle.get(
					"https://api.powerbi.com/v1.0/myorg/datasets",
					{ headers: context.powerBiHeader },
					(_, resp, __) => processResponse(resp, "Check if dataset exists",
						() => { context.datasetId = findDatasetByName(resp.body.value, datasetDefinition.dataset.name); return context; }, wfCallback)),
			(context: IImportContext, wfCallback: any) => {
				// If target dataset doesn't exist, create it
				if (!context.datasetId) {
					needle.post(
						"https://api.powerbi.com/v1.0/myorg/datasets?defaultRetentionPolicy=None",
						datasetDefinition.dataset,
						{ headers: context.powerBiHeader, json: true },
						(_, resp, __) => processResponse(resp, "Create dataset in Power BI",
							() => { context.datasetId = resp.body.id; return context; }, wfCallback, 201));
				} else {
					wfCallback(null, context);
				}
			},
			(context: IImportContext, wfCallback: any) => 
				// Delete existing data in target table
				needle.delete(
					`https://api.powerbi.com/v1.0/myorg/datasets/${context.datasetId}/tables/${datasetDefinition.dataset.tables[0].name}/rows`,
					null, { headers: context.powerBiHeader },
					(_, resp, __) => processResponse(resp, "Delete existing data in Power BI",
						() => context, wfCallback)),
			(context: IImportContext, wfCallback: any) =>
				// Load data in Power BI
				needle.post(
					`https://api.powerbi.com/v1.0/myorg/datasets/${context.datasetId}/tables/${datasetDefinition.dataset.tables[0].name}/rows`,
					{ rows: context.tcData },
					{ headers: context.powerBiHeader, json: true },
					(_, resp, __) => processResponse(resp, "Loading data in Power BI",
						() => context, wfCallback)),
		],
			(err: Error, resp: any) => {
				if (!err) {
					console.log(chalk.bgGreen.white("Import succeeded."));
				}
			});
	}
}