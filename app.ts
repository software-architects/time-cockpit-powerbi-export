/// <reference path="typings/tsd.d.ts" />
import * as chalk from "chalk";
import * as i from "./importer";

console.log(chalk.bgBlue.white("*** Time Cockpit to Power BI Importer ***"));

// Transfer invoices from time cockpit to Power BI.
// Add additional calls to i.powerBiImporter.importData if you want to transfer
// more data sets (e.g. time sheet records).
console.log(chalk.blue("\nImporting Invoices:"));
i.powerBiImporter.importData({
	tcqlQuery: `From I In Invoice Select New With { .InvoiceYear = :Year(I.InvoiceDate),  
		.InvoiceMonth = :Month(I.InvoiceDate), .Revenue = Sum(I.Revenue),
		.Customer = :DisplayValue(I.Project.Customer), 
		.Country = :DisplayValue(I.Project.Customer.Country),
		.Project = :DisplayValue(I.Project)	}`,
	dataset: {
		name: "Invoices",
		tables: [
			{
				name: "Invoices",
				columns: [
					{ name: "ObjectUuid", dataType: "String" },
					{ name: "USR_InvoiceYear", dataType: "Int64" },
					{ name: "USR_InvoiceMonth", dataType: "Int64" },
					{ name: "USR_Customer", dataType: "String" },
					{ name: "USR_Country", dataType: "String" },
					{ name: "USR_Project", dataType: "String" },
					{ name: "USR_Revenue", dataType: "Double" }
				]
			}
		]
	}
});

/*
// Transfer time sheet record from time cockpit to Power BI.
console.log(chalk.blue("\nImporting Time Sheet Records:"));
i.powerBiImporter.importData({
	tcqlQuery: `From T In Timesheet Select New With { .DurationInHours = Sum(T.DurationInHours),  
		.TimesheetYear = :Year(T.BeginTime),
		.TimesheetMonth = :Month(T.BeginTime),
		.TimesheetDay = :Day(T.BeginTime),
		.Employee = :DisplayValue(T.UserDetail), 
		.Customer = :DisplayValue(T.Project.Customer),
		.Project = :DisplayValue(T.Project)	}`,
	dataset: {
		name: "Timesheets",
		tables: [
			{
				name: "Timesheets",
				columns: [
					{ name: "ObjectUuid", dataType: "String" },
					{ name: "USR_DurationInHours", dataType: "Double" },
					{ name: "USR_TimesheetYear", dataType: "Int64" },
					{ name: "USR_TimesheetMonth", dataType: "Int64" },
					{ name: "USR_TimesheetDay", dataType: "Int64" },
					{ name: "USR_Employee", dataType: "String" },
					{ name: "USR_Customer", dataType: "String" },
					{ name: "USR_Project", dataType: "String" }
				]
			}
		]
	}
});
*/