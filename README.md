# Xray client library for automation

- Xray server/DC and cloud
- upload test results in different formats

## Installation

```bash
npm i xray-automation
```

## Usage

```ts
import XrayClient from 'xray-automation';
const config: XrayClientConfig = {
    jiraUsername: 'username',
    jiraPassword: 'password'
    jiraBaseUrl: 'http://myserver.jira.local'
};

const xrayClient = XrayClient(config);
let reportFile = 'report.xml';
let standardConfig = {
    format: XrayClient.ROBOT_FORMAT,
    projectKey: 'BOOK',
    version: '1.0',
    revision: '123',
    testPlanKey: 'CALC-10',
    testExecKey: 'CALC-11',
    testEnvironments: [],
}

let res = await xrayClient.submitResults(file: reportFile, config: standardConfig);


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
    format: ROBOT_FORMAT,
    testInfoFile: 'testInfo.json',
    // testInfo: testInfoJson,
    testExecInfoFile: 'testExecInfo.json',
    // testExecInfo: testExecInfoJson,
}

let res = await xrayClient.submitResultsMultipart(file: reportFile, config: multipartConfig);

/*
const testExecKey = 'CALC-11' // res.data.key or res.data.testExecIssue;
let res = await xrayClient.associateTestExecutionToTestPlan(testExecKey: testExecKey, testPlanKey: 'CALC-10');
let res = await xrayClient.addTestExecutionTestsToTestPlan(testExecKey: testExecKey, testPlanKey: 'CALC-10');
*/
```

## Xray REST API response examples

### Xray cloud

```js
{
  "id": "10200",
  "key": "XNP-24",
  "self": "https://www.example.com/rest/api/2/issue/10200"
}
```

### Xray server/DC (API v2)

```js
{
  "testExecIssue": {
    "id": "38101",
    "key": "TMP-82",
    "self": "http://localhost:30000/rest/api/2/issue/38101"
  },
  "testIssues": {
    "success": [
      {
        "self": "http://localhost:30000/rest/api/2/issue/36600",
        "id": "36600",
        "key": "TMP-1"
      }
    ]
  }
}
```

### Xray server/DC (API v1)

```js
{
  "testExecIssue": {
    "id": "10200",
    "key": "XNP-24",
    "self": "http://www.example.com/jira/rest/api/2/issue/10200"
  }
}
```
