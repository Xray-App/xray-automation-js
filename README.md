# Xray JavaScript client library for assisting on test automation tasks

[![build workflow](https://github.com/Xray-App/xray-automation-js/actions/workflows/CI.yml/badge.svg)](https://github.com/Xray-App/xray-automation-js/actions/workflows/CI.yml)
[![license](https://img.shields.io/badge/License-BSD%203--Clause-green.svg)](https://opensource.org/licenses/BSD-3-Clause)
[![Gitter chat](https://badges.gitter.im/gitterHQ/gitter.png)](https://gitter.im/Xray-App/community)

`xray-automation` is a JavaScript library to assist on common test automation tasks, such as the ability to upload test results from your pipeline during CI/CD.


**Core features:**
- supports Xray datacenter(DC)/server, and Xray cloud
- upload test automation results in different formats
- Promise based (e.g, `.then().catch() ...`)
- upload results with standard parameters to identify Jira project, its version, revision, test environment..
- upload results with ability to fully customize Test Execution and Test issues, using a more low-level request (that uses the "multipart" endpoint variant)


## Background

This libbrary provides an abstraction layer for the underlying APIs that Xray provides on the different Jira deployment flavours.
Xray provides different kinds of APIs and also different endpoints to support importing of test results in different format.
Xray's REST API is the main API used for this purpose. It's available both on Xray datacenter/server and also on Xray cloud; there some slight differences between them.
The REST API provides the ability to import results (both on Xray DC/server and Xray cloud), and also the ability to manage the relation between entities  (Xray DC/server only).
The GraphQL API is only available on Xray cloud; it provides the ability to manage relation between entities on Xray cloud.

## Installation

```bash
npm i xray-automation
```

## Usage

This library provides two main objects, `XrayDatacenterClient` and `XrayCloudClient`, that provide the ability to interact with Xray on Jira datacenter/server or with Xray on Jira Cloud, respectively. Therefore, and first of all, you must know which Jira deployment variant you're using. 

### Client initialization and configuration

For Xray cloud we need to use a client id + client secret pair, from a API key defined in Xray. Please see [API keys (client id + client secret pair) on Xray cloud](https://docs.getxray.app/display/XRAYCLOUD/Global+Settings%3A+API+Keys).

```javascript
import { XrayCloudClient } from 'xray-automation'

const xrayCloudSettings = {
    clientId: '0000000000',
    clientSecret: '1111111111'
}; 

const xrayClient = XrayCloudClient(xrayCloudSettings);
```


For Xray server/datacenter, we can use basic authentication and provide a Jira username/password.
For Xray datacenter on a compatible Jira DC version (>= 8.14), we can also use PAN (Personal Access Tokens).

```javascript
import { XrayDatacenterClient } from 'xray-automation'

const configWithCredentials = {
    jiraBaseUrl: 'http://myserver.jira.local',
    jiraUsername: 'username',
    jiraPassword: 'password'
};

// or...

const configUsingToken = {
    jiraBaseUrl: 'http://myserver.jira.local',
    jiraToken: 'xxxxxx',
};

const xrayClient = XrayDatacenterClient(configWithXXX);
```


### Import test results to Xray (basic scenario)

To import results, we need to use the method `submitResults(reportFile, reportConfig)` on the respective Xray client object.
- `reportFile`: file with the test results (relative or absolute path)
- `reportConfig`: an object with additional settings, mostly to assign values on the corresponding Test Execution issue; possible values on the table ahead.


| setting | description | mandatory/optional| example |
| --- | --- | --- | --- |
| `format` | format of the report (import&use JUNIT_FORMAT, TESTNG_FORMAT, NUNIT_FORMAT, XUNIT_FORMAT, ROBOT_FORMAT, CUCUMBER_FORMAT, BEHAVE_FORMAT, XRAY_FORMAT) | mandatory | XRAY_FORMAT (or "xray") |
| `projectKey`| key of Jira project where to import the results | mandatory (doesn't apply to "cucumber" or "behave" report formats, for legacy reasons) | CALC |
| `testExecKey` | issue key of Test Execution, in case we want to update the results on it | optional | CALC-2 |
| `testPlanKey` | issue key of Test Plan to link the results to | optional |CALC-1 |
| `version` | ersion of the SUT, that corresponds to the Jira project version/release; it will be assigned to the Test Execution issue using the "fixVersion(s)" field | optional | 1.0 |
| `revision` | `xray.revision` | source code revision or a build identifier | optional | 123 |
| `testEnvironments` |usually, a [test environment](https://docs.getxray.app/display/XRAYCLOUD/Working+with+Test+Environments) name/identifier (e.g., browser vendor, OS version , mobile device, testing stage) | optional | [chrome] |


```javascript
import { XrayDatacenterClient, XrayCloudClient, JUNIT_FORMAT } from 'xray-automation'

let reportFile = 'report.xml';
let reportConfig = {
    format: JUNIT_FORMAT,
    projectKey: 'BOOK',
    version: '1.0',
    revision: '123',
    testPlanKey: 'CALC-10',
    testExecKey: 'CALC-11',
    testEnvironments: [],
}

let res = await xrayClient.submitResults(reportFile, reportConfig);
console.log('Test Execution key: ' + res.key);
```


Please note that Xray server/DC and Xray cloud support mostly the same formats, but not exactly for legacy reasons. Besides, not all formats support the same parameters; please check the respective product documentation. The following table sums this info.

|report format| supported Xray variant| notes |
| --- | --- | --- |
| xray | cloud and server/DC | the format is not exactly the same as Xray and Jira itself are different on server/DC and cloud |
| junit | cloud and server/DC | |
| xunit | cloud and server/DC | |
| nunit | cloud and server/DC | |
| robot | cloud and server/DC | |
| testng | cloud and server/DC | |
| cucumber | cloud and server/DC | in this specific case, it's not possible to use the parameters `projectKey`, `version`, `revision`, `testPlanKey`, `testExecKey`, `testEnvironments` (due to the way the underlying "standard" endpoint for Cucumber works)  |
| behave | server/DC | in this specific case, it's not possible to use the parameters `projectKey`, `version`, `revision`, `testPlanKey`, `testExecKey`, `testEnvironments` (due to the way the underlying "standard" endpoint for Cucumber works). For Xray cloud, it's possible to convert it to a cucumber JSON report though and then import it as [shown on this tutorial](https://docs.getxray.app/display/XRAYCLOUD/Testing+using+Behave+in+Python) |



### Import test results to Xray with customization of Test Execution and Test issues (advanced scenario)

Related to each report format (e.g., "junit") , there's a "standard" endpoint (e.g., ".../import/junit") and a "multipart" endpoint one (e.g., ".../import/junit/multipart")

The "standard" Xray REST API endpoints allow us to pass some well-known parameters to identify the target project and its version, for example.
However, sometimes we may need to customize additional fields on the Test Execution issue that will be created whenever uploading test results.
For that, we have to use the "multipart" endpoint which has a completely different syntax. 


To import results with customization possibilities, which internally will use the proper "multipart" endpoint for that test report format, we need to use the method `submitResultsMultipart(reportFile, reportConfig)` on the respective Xray client object.
- `reportFile`: file with the test results (relative or absolute path)
- `reportConfig`: an object with additional settings; possible values on the table ahead.

| setting | description | mandatory/optional| example |
| --- | --- | --- | --- |
| `format` | format of the report (import&use JUNIT_FORMAT, TESTNG_FORMAT, NUNIT_FORMAT, XUNIT_FORMAT, ROBOT_FORMAT, CUCUMBER_FORMAT, BEHAVE_FORMAT, XRAY_FORMAT) | mandatory | XRAY_FORMAT (or "xray") |
| `testExecInfoFile` | path to a JSON file containing attributes to apply on the Test Execution issue that will be created, following Jira issue update syntax | mandatory (if testExecInfo is not provided) | - |
| `testExecInfo` | JSON object containing attributes to apply on the Test Execution issue that will be created, following Jira issue update syntax | mandatory (if testExecInfoFile is not provided) | - |
| `testInfoFile` | path to a JSON file containing attributes to apply on the Test issues that may be created, following Jira issue update syntax | optional | - |
| `testInfo | JSON object containing attributes to apply on the Test issues that may be created, following Jira issue update syntax | optional | - |


```
import { XrayDatacenterClient, XrayCloudClient, JUNIT_FORMAT } from 'xray-automation'

...
let testExecInfoJson = { 
    "fields": {
        "project": {
            "key": "CALC"
        },
        "summary": "Test Execution for Junit tets",
        "description": "This contains test automation results"
    }
};

let multipartConfig = {
    format: JUNIT_FORMAT,
    testInfoFile: 'testInfo.json',
    // testInfo: testInfoJson,
    testExecInfoFile: 'testExecInfo.json',
    // testExecInfo: testExecInfoJson,
}

let res = await xrayClient.submitResultsMultipart(file: reportFile, config: multipartConfig);
console.log('Test Execution key: ' + res.key);
```


### Associate Test Execution to Test Plan

Whenever using the `submitResults` method, and for most formats, it´s possible to associate the Test Execution to an existing Test Plan.
However, for some formats (and respective endpoints), this may not be possible. Also, on multipart endpoints it may not be something straightforward (e.g., you may need to know the Test Plan custom field id for Jira server/DC).


```javascript
let testExecKey = 'CALC-11';
let testPlanKey = 'CALC-10';
let res = await xrayClient.associateTestExecutionToTestPlan(testExecKey, testPlanKey);

// or if you know the issue ids... (Xray on Jira cloud only)
// let res = await xrayClient.associateTestExecutionToTestPlanByIds('10001', '10000');

console.log('Test Execution key: ' + res.key);
```


## FAQ

1. If we have questions/support issues, where should those be addressed?

It's an open-source project, so it should be handled in this GitHub project and supported by the community. If you want to use the previous, proprietary plugin, you can do so and that has commercial support, if you have a valid license.

2. Are the underlying APIs the same for Xray server/datacenter and Xray Cloud? Are the available options the same? Are the supported test automation report formats the same?

Not exactly. Xray server/datacenter and Xray cloud, even though similar, are actually distinct products; besides Jira server/datacenter and Jira cloud are different between themselves and have different capabilities. This plugin makes use of the available REST APIs for Xray server/datacenter and Xray cloud, so you should check them to see exactly what is supported for your environment.

## Contact

You may find me on [Twitter](https://twitter.com/darktelecom).
Any questions related with this code, please raise issues in this GitHub project. Feel free to contribute and submit PR's.
For Xray specific questions, please contact [Xray's support team](https://jira.getxray.app/servicedesk/customer/portal/2).

## Disclaimer

This project is in early stage; the setting names and other are subject to change.

## Acknowledgments

TBD

## TO DOs

- implement cucumber related operations/endpoints
- jest coverage badge
- REST API v1 support?
- review modules support
- convert to TypeScript

## [Changelog](CHANGELOG.md)

## References

- [Importing test results (Xray server/datacenter)](https://docs.getxray.app/display/XRAY/Import+Execution+Results+-+REST)
- [Importing test results (Xray cloud)](https://docs.getxray.app/display/XRAYCLOUD/Import+Execution+Results+-+REST+v2)
- [Import Cucumber tests (Xray server/datacenter)](https://docs.getxray.app/display/XRAY/Importing+Cucumber+Tests+-+REST)
- [Import Cucumber tests (Xray cloud)](https://docs.getxray.app/display/XRAYCLOUD/Importing+Cucumber+Tests+-+REST+v2)
- [Export Cucumber tests (Xray server/datacenter)](https://docs.getxray.app/display/XRAY/Exporting+Cucumber+Tests+-+REST)
- [Export Cucumber tests (Xray cloud)](https://docs.getxray.app/display/XRAYCLOUD/Exporting+Cucumber+Tests+-+REST+v2)
- [Using Personal Access Tokens (Xray datacenter)](https://confluence.atlassian.com/enterprise/using-personal-access-tokens-1026032365.html)
- [API keys (client id + client secret pair) on Xray cloud](https://docs.getxray.app/display/XRAYCLOUD/Global+Settings%3A+API+Keys)

## LICENSE

[BSD 3-Clause](LICENSE)
