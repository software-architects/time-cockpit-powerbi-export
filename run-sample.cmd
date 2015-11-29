@ECHO OFF

REM Add data about the app from Azure AD here
REM For details see https://msdn.microsoft.com/en-US/library/dn877542.aspx
SET AZURE_AD_APP_ID=00000000-0000-0000-0000-000000000000
SET AZURE_AD_TENANT=mycompany.emea.microsoftonline.com
SET AZURE_AD_APP_SECRET=mysecretappcodefromazuread

REM Add user and password you want to use for Power BI
SET POWERBI_USER=tom.smith@mycompany.com
SET POWERBI_PASSWORD=mysupersecurepassword

REM Add user and password you want to use for time cockpit
SET TC_USER=tom.smith@mycompany.com
SET TC_PASSWORD=mytimecockpitpassword

node app.js
