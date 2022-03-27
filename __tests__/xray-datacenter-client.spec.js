/*
var axios = require("axios");
var MockAdapter = require("axios-mock-adapter");
const multipart = require('parse-multipart-data');
const  XrayDatacenterClient = require('../src/xray-server-client.js')
const  XrayErrorResponse = require('../src/xray-error-response.js')
const  XrayServerResponseV1 = require('../src/xray-server-response-v1.js')
const  XrayDatacenterResponseV2 = require('../src/xray-server-response-v2.js')
*/

import axios from 'axios';
import fs from 'fs';
import MockAdapter from 'axios-mock-adapter';
import multipart from 'parse-multipart-data';

import XrayDatacenterClient from '../src/xray-datacenter-client.js';
import XrayErrorResponse from '../src/xray-error-response.js';
import XrayDatacenterResponseV2 from '../src/xray-datacenter-response-v2.js';
import { XRAY_FORMAT, JUNIT_FORMAT, TESTNG_FORMAT, ROBOT_FORMAT, NUNIT_FORMAT, XUNIT_FORMAT, CUCUMBER_FORMAT, BEHAVE_FORMAT } from '../src/index.js';


describe('authentication', () => {
  let mock;
  let xrayClient;
  let reportFile = '__tests__/resources/robot.xml';
  const successfulResponseData = {
    "testExecIssue": {
      "id": "38101",
      "key": "CALC-82",
      "self": "http://xray.example.com/rest/api/2/issue/38101"
    },
    "testIssues": {
      "success": [
        {
          "self": "http://xray.example.com/rest/api/2/issue/36600",
          "id": "36600",
          "key": "CALC-1"
        }
      ]
    }
  }

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });
  
  afterEach(() => {
    mock.resetHistory();
  });

  it('can be maded with basic auth using username and password', async() => {
      /*
      mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/robot?projectKey=CALC',
          expect.objectContaining({
              Authorization: expect.stringMatching(/^Basic dXNlcm5hbWU6cGFzc3dvcmQ=$/),
        })).reply(200, data);
      */

      mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/robot?projectKey=CALC').reply(200, successfulResponseData);

      const xrayServerSettings = {
          jiraBaseUrl: 'http://xray.example.com',
          jiraUsername: 'username',
          jiraPassword: 'password'
      }; 
      const xrayClient = new XrayDatacenterClient(xrayServerSettings);
      let reportConfig = {
        format: ROBOT_FORMAT,
        projectKey: 'CALC'
      }
      try {
          let response = await xrayClient.submitResults(reportFile, reportConfig);
          expect(response._response.config.headers['Authorization']).toEqual("Basic dXNlcm5hbWU6cGFzc3dvcmQ=")
          expect(response._response.status).toEqual(200);
          expect(response._response.data).toEqual(successfulResponseData);
      } catch (error) {
          throw error;
      }

  });


  it('can be maded with PAT (Personal Access Token)', async() => {

      mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/robot?projectKey=CALC').reply(200, successfulResponseData);

      const xrayServerSettings = {
          jiraBaseUrl: 'http://xray.example.com',
          jiraToken: 'OTE0ODc2NDE2NTgxOnrhigwOreFoyNIA9lXTZaOcgbNY'
      }; 
      const xrayClient = new XrayDatacenterClient(xrayServerSettings);
      let reportConfig = {
        format: ROBOT_FORMAT,
        projectKey: 'CALC'
      }
      try {
          let response = await xrayClient.submitResults(reportFile, reportConfig);
          expect(response._response.config.headers['Authorization']).toEqual('Bearer OTE0ODc2NDE2NTgxOnrhigwOreFoyNIA9lXTZaOcgbNY')
          expect(response._response.status).toEqual(200);
          expect(response._response.data).toEqual(successfulResponseData);
      } catch (error) {
          throw error;
      }

  });
});

describe('invalid request for some report file', () => {
  let mock;
  let xrayClient;
  let reportFile = '__tests__/resources/dummy.xml';

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayServerSettings = {
      jiraBaseUrl: 'http://xray.example.com',
      jiraUsername: 'username',
      jiraPassword: 'password'
    }; 
    xrayClient = new XrayDatacenterClient(xrayServerSettings);
  });
  
  afterEach(() => {
    mock.resetHistory();
  });

  it('returns an error if unable to read reportFile', async() => {
    mock.onPost().reply(200, {});

    let reportConfig = {
      format: JUNIT_FORMAT,
      projectKey: 'CALC'
    };
    
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);
    } catch (error) {
      expect(error._response).toEqual("ENOENT: no such file or directory, open '__tests__/resources/dummy.xml'");
    }
  });

  it('returns an error if format is not specified', async() => {
    mock.onPost().reply(200, {});

    let reportConfig = {};
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);
    } catch (error) {
      expect(error._response).toEqual('ERROR: format must be specified');
    }
  });

  it('returns an error if format is not supported', async() => {
    mock.onPost().reply(200, {});

    let reportConfig = { format: 'dummy'};
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);
    } catch (error) {
      expect(error._response).toEqual('ERROR: unsupported format dummy');
    }
  });
});

describe('JUnit standard endpoint', () => {
  let mock;
  let xrayClient;
  let reportFile = '__tests__/resources/junit.xml';
  const successfulResponseData = {
    "testExecIssue": {
      "id": "38101",
      "key": "CALC-82",
      "self": "http://xray.example.com/rest/api/2/issue/38101"
    },
    "testIssues": {
      "success": [
        {
          "self": "http://xray.example.com/rest/api/2/issue/36600",
          "id": "36600",
          "key": "CALC-1"
        }
      ]
    }
  }

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayServerSettings = {
      jiraBaseUrl: 'http://xray.example.com',
      jiraUsername: 'username',
      jiraPassword: 'password'
    }; 
    xrayClient = new XrayDatacenterClient(xrayServerSettings);
  });
  
  afterEach(() => {
    mock.resetHistory();
  });

  it('returns an error when submitResults is called, without projectKey or testExecKey', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/junit').reply(200, successfulResponseData);

    let reportConfig = { format: JUNIT_FORMAT };
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);
    } catch (error) {
      expect(error._response).toEqual('ERROR: projectKey or testExecKey must be defined');
    }
  });

  it('sends the correct URL encoded parameters when submitResults is called', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/junit?projectKey=CALC&testPlanKey=CALC-10&testExecKey=CALC-82&fixVersion=1.0&revision=123&testEnvironments=chrome').reply(200, successfulResponseData);

    let reportConfig = {
      format: JUNIT_FORMAT,
      projectKey: 'CALC',
      testPlanKey: 'CALC-10',
      testExecKey: 'CALC-82',
      version: '1.0',
      revision: '123',
      testEnvironment: 'chrome'
    }
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);
    } catch (error) {
        throw error;
    }
  });

  it('sends the correct URL encoded parameters, for multiple testEnvironments, when submitResults is called', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/junit?projectKey=CALC&testPlanKey=CALC-10&testExecKey=CALC-82&fixVersion=1.0&revision=123&testEnvironments=chrome%3Bmac').reply(200, successfulResponseData);

    let reportConfig = {
      format: JUNIT_FORMAT,
      projectKey: 'CALC',
      testPlanKey: 'CALC-10',
      testExecKey: 'CALC-82',
      version: '1.0',
      revision: '123',
      testEnvironments: ['chrome', 'mac']
    }
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);
    } catch (error) {
        throw error;
    }
  });

  it('sends the correct payload when submitResults is called', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/junit?projectKey=CALC').reply(200, successfulResponseData);

    let reportConfig = {
      format: JUNIT_FORMAT,
      projectKey: 'CALC'
    }
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(1);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      //expect(parts[0].name).toEqual('file');
      expect(rawFormData).toEqual(expect.stringContaining(' name="file"'));

      expect(parts[0].filename).toEqual('report.xml');
      expect(parts[0].type).toEqual('application/xml');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
    } catch (error) {
        throw error;
    }
  });

  it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/junit?projectKey=CALC').reply(200, successfulResponseData);

        let reportConfig = {
          format: JUNIT_FORMAT,
          projectKey: 'CALC'
        }
        try {
            let response = await xrayClient.submitResults(reportFile, reportConfig);
            expect(response._response.data).toEqual(successfulResponseData);
            expect(response.id).toEqual(successfulResponseData.testExecIssue.id);
            expect(response.key).toEqual(successfulResponseData.testExecIssue.key);
            expect(response.selfUrl).toEqual(successfulResponseData.testExecIssue.self);
        } catch (error) {
            throw error;
        }

    });
});

describe('TestNG standard endpoint', () => {
  let mock;
  let xrayClient;
  let reportFile = '__tests__/resources/testng.xml';
  const successfulResponseData = {
    "testExecIssue": {
      "id": "38101",
      "key": "CALC-82",
      "self": "http://xray.example.com/rest/api/2/issue/38101"
    },
    "testIssues": {
      "success": [
        {
          "self": "http://xray.example.com/rest/api/2/issue/36600",
          "id": "36600",
          "key": "CALC-1"
        }
      ]
    }
  }

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayServerSettings = {
      jiraBaseUrl: 'http://xray.example.com',
      jiraUsername: 'username',
      jiraPassword: 'password'
    }; 
    xrayClient = new XrayDatacenterClient(xrayServerSettings);
  });
  
  afterEach(() => {
    mock.resetHistory();
  });

  it('returns an error when submitResults is called, without projectKey or testExecKey', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/testng').reply(200, successfulResponseData);

    let reportConfig = { format: TESTNG_FORMAT };
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);
    } catch (error) {
      expect(error._response).toEqual('ERROR: projectKey or testExecKey must be defined');
    }
  });

  it('sends the correct URL encoded parameters when submitResults is called', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/testng?projectKey=CALC&testPlanKey=CALC-10&testExecKey=CALC-82&fixVersion=1.0&revision=123&testEnvironments=chrome').reply(200, successfulResponseData);

    let reportConfig = {
      format: TESTNG_FORMAT,
      projectKey: 'CALC',
      testPlanKey: 'CALC-10',
      testExecKey: 'CALC-82',
      version: '1.0',
      revision: '123',
      testEnvironment: 'chrome'
    }
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);
    } catch (error) {
        throw error;
    }
  });

  it('sends the correct URL encoded parameters, for multiple testEnvironments, when submitResults is called', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/testng?projectKey=CALC&testPlanKey=CALC-10&testExecKey=CALC-82&fixVersion=1.0&revision=123&testEnvironments=chrome%3Bmac').reply(200, successfulResponseData);

    let reportConfig = {
      format: TESTNG_FORMAT,
      projectKey: 'CALC',
      testPlanKey: 'CALC-10',
      testExecKey: 'CALC-82',
      version: '1.0',
      revision: '123',
      testEnvironments: ['chrome', 'mac']
    }
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);
    } catch (error) {
        
        throw error;
    }
  });

  it('sends the correct payload when submitResults is called', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/testng?projectKey=CALC').reply(200, successfulResponseData);

    let reportConfig = {
      format: TESTNG_FORMAT,
      projectKey: 'CALC'
    }
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(1);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      //expect(parts[0].name).toEqual('file');
      expect(rawFormData).toEqual(expect.stringContaining(' name="file"'));

      expect(parts[0].filename).toEqual('report.xml');
      expect(parts[0].type).toEqual('application/xml');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
    } catch (error) {
        throw error;
    }
  });

  it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/testng?projectKey=CALC').reply(200, successfulResponseData);

        let reportConfig = {
          format: TESTNG_FORMAT,
          projectKey: 'CALC'
        }
        try {
          let response = await xrayClient.submitResults(reportFile, reportConfig);
          expect(response._response.data).toEqual(successfulResponseData);
          expect(response.id).toEqual(successfulResponseData.testExecIssue.id);
          expect(response.key).toEqual(successfulResponseData.testExecIssue.key);
          expect(response.selfUrl).toEqual(successfulResponseData.testExecIssue.self);
        } catch (error) {
          throw error;
        }

    });
});

describe('Nunit standard endpoint', () => {
  let mock;
  let xrayClient;
  let reportFile = '__tests__/resources/nunit.xml';
  const successfulResponseData = {
    "testExecIssue": {
      "id": "38101",
      "key": "CALC-82",
      "self": "http://xray.example.com/rest/api/2/issue/38101"
    },
    "testIssues": {
      "success": [
        {
          "self": "http://xray.example.com/rest/api/2/issue/36600",
          "id": "36600",
          "key": "CALC-1"
        }
      ]
    }
  }

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayServerSettings = {
      jiraBaseUrl: 'http://xray.example.com',
      jiraUsername: 'username',
      jiraPassword: 'password'
    }; 
    xrayClient = new XrayDatacenterClient(xrayServerSettings);
  });
  
  afterEach(() => {
    mock.resetHistory();
  });

  it('returns an error when submitResults is called, without projectKey or testExecKey', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/nunit').reply(200, successfulResponseData);

    let reportConfig = { format: NUNIT_FORMAT };
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);
    } catch (error) {
      expect(error._response).toEqual('ERROR: projectKey or testExecKey must be defined');
    }
  });

  it('sends the correct URL encoded parameters when submitResults is called', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/nunit?projectKey=CALC&testPlanKey=CALC-10&testExecKey=CALC-82&fixVersion=1.0&revision=123&testEnvironments=chrome').reply(200, successfulResponseData);

    let reportConfig = {
      format: NUNIT_FORMAT,
      projectKey: 'CALC',
      testPlanKey: 'CALC-10',
      testExecKey: 'CALC-82',
      version: '1.0',
      revision: '123',
      testEnvironment: 'chrome'
    }
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);
    } catch (error) {
      throw error;
    }
  });

  it('sends the correct URL encoded parameters, for multiple testEnvironments, when submitResults is called', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/nunit?projectKey=CALC&testPlanKey=CALC-10&testExecKey=CALC-82&fixVersion=1.0&revision=123&testEnvironments=chrome%3Bmac').reply(200, successfulResponseData);

    let reportConfig = {
      format: NUNIT_FORMAT,
      projectKey: 'CALC',
      testPlanKey: 'CALC-10',
      testExecKey: 'CALC-82',
      version: '1.0',
      revision: '123',
      testEnvironments: ['chrome', 'mac']
    }
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);
    } catch (error) {
        
        throw error;
    }
  });

  it('sends the correct payload when submitResults is called', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/nunit?projectKey=CALC').reply(200, successfulResponseData);

    let reportConfig = {
      format: NUNIT_FORMAT,
      projectKey: 'CALC'
    }
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(1);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      //expect(parts[0].name).toEqual('file');
      expect(rawFormData).toEqual(expect.stringContaining(' name="file"'));

      expect(parts[0].filename).toEqual('report.xml');
      expect(parts[0].type).toEqual('application/xml');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
    } catch (error) {
      throw error;
    }
  });

  it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/nunit?projectKey=CALC').reply(200, successfulResponseData);

        let reportConfig = {
          format: NUNIT_FORMAT,
          projectKey: 'CALC'
        }
        try {
            let response = await xrayClient.submitResults(reportFile, reportConfig);
            expect(response._response.data).toEqual(successfulResponseData);
            expect(response.id).toEqual(successfulResponseData.testExecIssue.id);
            expect(response.key).toEqual(successfulResponseData.testExecIssue.key);
            expect(response.selfUrl).toEqual(successfulResponseData.testExecIssue.self);
        } catch (error) {
          throw error;
        }

    });
});

describe('xunit standard endpoint', () => {
  let mock;
  let xrayClient;
  let reportFile = '__tests__/resources/xunit.xml';
  const successfulResponseData = {
    "testExecIssue": {
      "id": "38101",
      "key": "CALC-82",
      "self": "http://xray.example.com/rest/api/2/issue/38101"
    },
    "testIssues": {
      "success": [
        {
          "self": "http://xray.example.com/rest/api/2/issue/36600",
          "id": "36600",
          "key": "CALC-1"
        }
      ]
    }
  }

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayServerSettings = {
      jiraBaseUrl: 'http://xray.example.com',
      jiraUsername: 'username',
      jiraPassword: 'password'
    }; 
    xrayClient = new XrayDatacenterClient(xrayServerSettings);
  });
  
  afterEach(() => {
    mock.resetHistory();
  });

  it('returns an error when submitResults is called, without projectKey or testExecKey', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/xunit').reply(200, successfulResponseData);

    let reportConfig = { format: XUNIT_FORMAT };
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);
    } catch (error) {
      expect(error._response).toEqual('ERROR: projectKey or testExecKey must be defined');
    }
  });

  it('sends the correct URL encoded parameters when submitResults is called', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/xunit?projectKey=CALC&testPlanKey=CALC-10&testExecKey=CALC-82&fixVersion=1.0&revision=123&testEnvironments=chrome').reply(200, successfulResponseData);

    let reportConfig = {
      format: XUNIT_FORMAT,
      projectKey: 'CALC',
      testPlanKey: 'CALC-10',
      testExecKey: 'CALC-82',
      version: '1.0',
      revision: '123',
      testEnvironment: 'chrome'
    }
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);
    } catch (error) {
      throw error;
    }
  });

  it('sends the correct URL encoded parameters, for multiple testEnvironments, when submitResults is called', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/xunit?projectKey=CALC&testPlanKey=CALC-10&testExecKey=CALC-82&fixVersion=1.0&revision=123&testEnvironments=chrome%3Bmac').reply(200, successfulResponseData);

    let reportConfig = {
      format: XUNIT_FORMAT,
      projectKey: 'CALC',
      testPlanKey: 'CALC-10',
      testExecKey: 'CALC-82',
      version: '1.0',
      revision: '123',
      testEnvironments: ['chrome', 'mac']
    }
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);
    } catch (error) {
      throw error;
    }
  });

  it('sends the correct payload when submitResults is called', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/xunit?projectKey=CALC').reply(200, successfulResponseData);

    let reportConfig = {
      format: XUNIT_FORMAT,
      projectKey: 'CALC'
    }
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(1);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      //expect(parts[0].name).toEqual('file');
      expect(rawFormData).toEqual(expect.stringContaining(' name="file"'));

      expect(parts[0].filename).toEqual('report.xml');
      expect(parts[0].type).toEqual('application/xml');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
    } catch (error) {
      throw error;
    }
  });

  it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/xunit?projectKey=CALC').reply(200, successfulResponseData);

        let reportConfig = {
          format: XUNIT_FORMAT,
          projectKey: 'CALC'
        }
        try {
            let response = await xrayClient.submitResults(reportFile, reportConfig);
            expect(response._response.data).toEqual(successfulResponseData);
            expect(response.id).toEqual(successfulResponseData.testExecIssue.id);
            expect(response.key).toEqual(successfulResponseData.testExecIssue.key);
            expect(response.selfUrl).toEqual(successfulResponseData.testExecIssue.self);
        } catch (error) {
            
            throw error;
        }

    });
});

describe('Robot Framework standard endpoint', () => {
  let mock;
  let xrayClient;
  let reportFile = '__tests__/resources/robot.xml';
  const successfulResponseData = {
    "testExecIssue": {
      "id": "38101",
      "key": "CALC-82",
      "self": "http://xray.example.com/rest/api/2/issue/38101"
    },
    "testIssues": {
      "success": [
        {
          "self": "http://xray.example.com/rest/api/2/issue/36600",
          "id": "36600",
          "key": "CALC-1"
        }
      ]
    }
  }

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayServerSettings = {
      jiraBaseUrl: 'http://xray.example.com',
      jiraUsername: 'username',
      jiraPassword: 'password'
    }; 
    xrayClient = new XrayDatacenterClient(xrayServerSettings);
  });
  
  afterEach(() => {
    mock.resetHistory();
  });

  it('returns an error when submitResults is called, without projectKey or testExecKey', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/robot').reply(200, successfulResponseData);

    let reportConfig = { format: ROBOT_FORMAT };
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);
    } catch (error) {
      expect(error._response).toEqual('ERROR: projectKey or testExecKey must be defined');
    }
  });

  it('sends the correct URL encoded parameters when submitResults is called', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/robot?projectKey=CALC&testPlanKey=CALC-10&testExecKey=CALC-82&fixVersion=1.0&revision=123&testEnvironments=chrome').reply(200, successfulResponseData);

    let reportConfig = {
      format: ROBOT_FORMAT,
      projectKey: 'CALC',
      testPlanKey: 'CALC-10',
      testExecKey: 'CALC-82',
      version: '1.0',
      revision: '123',
      testEnvironment: 'chrome'
    }
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);
    } catch (error) {
      throw error;
    }
  });

  it('sends the correct URL encoded parameters, for multiple testEnvironments, when submitResults is called', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/robot?projectKey=CALC&testPlanKey=CALC-10&testExecKey=CALC-82&fixVersion=1.0&revision=123&testEnvironments=chrome%3Bmac').reply(200, successfulResponseData);

    let reportConfig = {
      format: ROBOT_FORMAT,
      projectKey: 'CALC',
      testPlanKey: 'CALC-10',
      testExecKey: 'CALC-82',
      version: '1.0',
      revision: '123',
      testEnvironments: ['chrome', 'mac']
    }
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);
    } catch (error) {
      throw error;
    }
  });

  it('sends the correct payload when submitResults is called', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/robot?projectKey=CALC').reply(200, successfulResponseData);

    let reportConfig = {
      format: ROBOT_FORMAT,
      projectKey: 'CALC'
    }
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(1);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      //expect(parts[0].name).toEqual('file');
      expect(rawFormData).toEqual(expect.stringContaining(' name="file"'));

      expect(parts[0].filename).toEqual('report.xml');
      expect(parts[0].type).toEqual('application/xml');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
    } catch (error) {
      throw error;
    }
  });

  it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/robot?projectKey=CALC').reply(200, successfulResponseData);

        let reportConfig = {
          format: ROBOT_FORMAT,
          projectKey: 'CALC'
        }
        try {
            let response = await xrayClient.submitResults(reportFile, reportConfig);
            expect(response._response.data).toEqual(successfulResponseData);
            expect(response.id).toEqual(successfulResponseData.testExecIssue.id);
            expect(response.key).toEqual(successfulResponseData.testExecIssue.key);
            expect(response.selfUrl).toEqual(successfulResponseData.testExecIssue.self);
        } catch (error) {
          throw error;
        }

    });
});

describe('Cucumber standard endpoint', () => {
  let mock;
  let xrayClient;
  let reportFile = '__tests__/resources/cucumber.json';
  const successfulResponseData = {
    "testExecIssue": {
      "id": "38101",
      "key": "CALC-82",
      "self": "http://xray.example.com/rest/api/2/issue/38101"
    },
    "testIssues": {
      "success": [
        {
          "self": "http://xray.example.com/rest/api/2/issue/36600",
          "id": "36600",
          "key": "CALC-1"
        }
      ]
    }
  }

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayServerSettings = {
      jiraBaseUrl: 'http://xray.example.com',
      jiraUsername: 'username',
      jiraPassword: 'password'
    }; 
    xrayClient = new XrayDatacenterClient(xrayServerSettings);
  });
  
  afterEach(() => {
    mock.resetHistory();
  });


  it('does not URL encode typical parameters when submitResults is called as this endpoint doesnt support it', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/cucumber').reply(200, successfulResponseData);

    let reportConfig = {
      format: CUCUMBER_FORMAT,
      projectKey: 'CALC',
      testPlanKey: 'CALC-10',
      testExecKey: 'CALC-82',
      version: '1.0',
      revision: '123',
      testEnvironment: 'chrome'
    }
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);
    } catch (error) {
      throw error;
    }
  });


  it('sends the correct payload when submitResults is called', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/cucumber').reply(200, successfulResponseData);

    let reportConfig = {
      format: CUCUMBER_FORMAT
    }
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      expect(mock.history.post[0].data).toEqual(reportContent);
    } catch (error) {
      throw error;
    }
  });

  it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/cucumber').reply(200, successfulResponseData);

        let reportConfig = {
          format: CUCUMBER_FORMAT
        }
        try {
            let response = await xrayClient.submitResults(reportFile, reportConfig);
            expect(response._response.data).toEqual(successfulResponseData);
            expect(response.id).toEqual(successfulResponseData.testExecIssue.id);
            expect(response.key).toEqual(successfulResponseData.testExecIssue.key);
            expect(response.selfUrl).toEqual(successfulResponseData.testExecIssue.self);
        } catch (error) {
          throw error;
        }

    });
});

describe('Behave standard endpoint', () => {
  let mock;
  let xrayClient;
  let reportFile = '__tests__/resources/behave.json';
  const successfulResponseData = {
    "testExecIssue": {
      "id": "38101",
      "key": "CALC-82",
      "self": "http://xray.example.com/rest/api/2/issue/38101"
    },
    "testIssues": {
      "success": [
        {
          "self": "http://xray.example.com/rest/api/2/issue/36600",
          "id": "36600",
          "key": "CALC-1"
        }
      ]
    }
  }

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayServerSettings = {
      jiraBaseUrl: 'http://xray.example.com',
      jiraUsername: 'username',
      jiraPassword: 'password'
    }; 
    xrayClient = new XrayDatacenterClient(xrayServerSettings);
  });
  
  afterEach(() => {
    mock.resetHistory();
  });


  it('does not URL encode typical parameters when submitResults is called as this endpoint doesnt support it', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/behave').reply(200, successfulResponseData);

    let reportConfig = {
      format: BEHAVE_FORMAT,
      projectKey: 'CALC',
      testPlanKey: 'CALC-10',
      testExecKey: 'CALC-82',
      version: '1.0',
      revision: '123',
      testEnvironment: 'chrome'
    }
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);
    } catch (error) {
      throw error;
    }
  });


  it('sends the correct payload when submitResults is called', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/behave').reply(200, successfulResponseData);

    let reportConfig = {
      format: BEHAVE_FORMAT
    }
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      expect(mock.history.post[0].data).toEqual(reportContent);
    } catch (error) {
      throw error;
    }
  });

  it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/behave').reply(200, successfulResponseData);

        let reportConfig = {
          format: BEHAVE_FORMAT
        }
        try {
          let response = await xrayClient.submitResults(reportFile, reportConfig);
          expect(response._response.data).toEqual(successfulResponseData);
          expect(response.id).toEqual(successfulResponseData.testExecIssue.id);
          expect(response.key).toEqual(successfulResponseData.testExecIssue.key);
          expect(response.selfUrl).toEqual(successfulResponseData.testExecIssue.self);
        } catch (error) {
          throw error;
        }

    });
});

describe('Xray JSON standard endpoint', () => {
  let mock;
  let xrayClient;
  let reportFile = '__tests__/resources/xray_server.json';
  const successfulResponseData = {
    "testExecIssue": {
      "id": "38101",
      "key": "CALC-82",
      "self": "http://xray.example.com/rest/api/2/issue/38101"
    },
    "testIssues": {
      "success": [
        {
          "self": "http://xray.example.com/rest/api/2/issue/36600",
          "id": "36600",
          "key": "CALC-1"
        }
      ]
    }
  }

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayServerSettings = {
      jiraBaseUrl: 'http://xray.example.com',
      jiraUsername: 'username',
      jiraPassword: 'password'
    }; 
    xrayClient = new XrayDatacenterClient(xrayServerSettings);
  });
  
  afterEach(() => {
    mock.resetHistory();
  });


  it('does not URL encode typical parameters when submitResults is called as this endpoint doesnt support it', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution').reply(200, successfulResponseData);

    let reportConfig = {
      format: XRAY_FORMAT,
      projectKey: 'CALC',
      testPlanKey: 'CALC-10',
      testExecKey: 'CALC-82',
      version: '1.0',
      revision: '123',
      testEnvironment: 'chrome'
    }
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);
    } catch (error) {      
      throw error;
    }
  });


  it('sends the correct payload when submitResults is called', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution').reply(200, successfulResponseData);

    let reportConfig = {
      format: XRAY_FORMAT
    }
    try {
      let response = await xrayClient.submitResults(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      expect(mock.history.post[0].data).toEqual(reportContent);
    } catch (error) {
      throw error;
    }
  });

  it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution').reply(200, successfulResponseData);

        let reportConfig = {
          format: XRAY_FORMAT
        }
        try {
            let response = await xrayClient.submitResults(reportFile, reportConfig);
            expect(response._response.data).toEqual(successfulResponseData);
            expect(response.id).toEqual(successfulResponseData.testExecIssue.id);
            expect(response.key).toEqual(successfulResponseData.testExecIssue.key);
            expect(response.selfUrl).toEqual(successfulResponseData.testExecIssue.self);
        } catch (error) {
          throw error;
        }

    });
});


/* multipart endpoints */

describe('JUnit multipart endpoint', () => {
  let mock;
  let xrayClient;
  let reportFile = '__tests__/resources/junit.xml';
  const successfulResponseData = {
    "testExecIssue": {
      "id": "38101",
      "key": "CALC-82",
      "self": "http://xray.example.com/rest/api/2/issue/38101"
    },
    "testIssues": {
      "success": [
        {
          "self": "http://xray.example.com/rest/api/2/issue/36600",
          "id": "36600",
          "key": "CALC-1"
        }
      ]
    }
  }

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayServerSettings = {
      jiraBaseUrl: 'http://xray.example.com',
      jiraUsername: 'username',
      jiraPassword: 'password'
    }; 
    xrayClient = new XrayDatacenterClient(xrayServerSettings);
  });
  
  afterEach(() => {
    mock.resetHistory();
  });

  it('returns an error when submitResultsMultipart is called, without Test Execution related info', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/junit/multipart').reply(200, successfulResponseData);

    let reportConfig = { format: JUNIT_FORMAT };
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
    } catch (error) {
      expect(error._response).toEqual('ERROR: testExecInfoFile or testExecInfo must be defined');
    }
  });

  it('sends the correct payload when submitResultsMultipart is called with Test Execution info', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/junit/multipart').reply(200, successfulResponseData);

    let reportConfig = {
      format: JUNIT_FORMAT,
      testExecInfo: {
        "fields": {
            "project": {
                "key": "BOOK"
            },
            "summary": "Test Execution for some automated tests",
            "issuetype": {
                "name": "Test Execution"
            }
        }
    }
    
    }
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="file"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual('report.xml');
      expect(parts[0].type).toEqual('application/xml');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual('info.json');
      expect(parts[1].type).toEqual('application/json');
      expect(parts[1].data.toString('utf-8')).toEqual(reportConfig.testExecInfo.toString('utf-8'));
    } catch (error) {
      throw error;
    }
  });

  it('sends the correct payload when submitResultsMultipart is called with Test Execution info in a file', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/junit/multipart').reply(200, successfulResponseData);

    let reportConfig = {
      format: JUNIT_FORMAT,
      testExecInfoFile: '__tests__/resources/testExecInfo.json',
    }
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="file"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual('report.xml');
      expect(parts[0].type).toEqual('application/xml');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual('info.json');
      expect(parts[1].type).toEqual('application/json');
      expect(parts[1].data.toString('utf-8')).toEqual(fs.readFileSync(reportConfig.testExecInfoFile).toString('utf-8'));
    } catch (error) {
        
        throw error;
    }
  });

  it('sends the correct payload when submitResultsMultipart is called with Test Execution and Tests info from files', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/junit/multipart').reply(200, successfulResponseData);

    let reportConfig = {
      format: JUNIT_FORMAT,
      testInfoFile: '__tests__/resources/testInfo.json',
      testExecInfoFile: '__tests__/resources/testExecInfo.json'
    }
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(3);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="file"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="testInfo"'));

      expect(parts[0].filename).toEqual('report.xml');
      expect(parts[0].type).toEqual('application/xml');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual('info.json');
      expect(parts[1].type).toEqual('application/json');
      expect(parts[1].data.toString('utf-8')).toEqual(fs.readFileSync(reportConfig.testExecInfoFile).toString('utf-8'));
      expect(parts[2].filename).toEqual('testInfo.json');
      expect(parts[2].type).toEqual('application/json');
      expect(parts[2].data.toString('utf-8')).toEqual(fs.readFileSync(reportConfig.testInfoFile).toString('utf-8'));
    } catch (error) {
        
        throw error;
    }
  });

  it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/junit/multipart').reply(200, successfulResponseData);

        let reportConfig = {
          format: JUNIT_FORMAT,
          testInfoFile: '__tests__/resources/testInfo.json',
          testExecInfoFile: '__tests__/resources/testExecInfo.json'
        }
        try {
            let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
            expect(response._response.data).toEqual(successfulResponseData);
            expect(response.id).toEqual(successfulResponseData.testExecIssue.id);
            expect(response.key).toEqual(successfulResponseData.testExecIssue.key);
            expect(response.selfUrl).toEqual(successfulResponseData.testExecIssue.self);
        } catch (error) {
            
            throw error;
        }

    });
});

describe('TestNG multipart endpoint', () => {
  let mock;
  let xrayClient;
  let reportFile = '__tests__/resources/testng.xml';
  const successfulResponseData = {
    "testExecIssue": {
      "id": "38101",
      "key": "CALC-82",
      "self": "http://xray.example.com/rest/api/2/issue/38101"
    },
    "testIssues": {
      "success": [
        {
          "self": "http://xray.example.com/rest/api/2/issue/36600",
          "id": "36600",
          "key": "CALC-1"
        }
      ]
    }
  }

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayServerSettings = {
      jiraBaseUrl: 'http://xray.example.com',
      jiraUsername: 'username',
      jiraPassword: 'password'
    }; 
    xrayClient = new XrayDatacenterClient(xrayServerSettings);
  });
  
  afterEach(() => {
    mock.resetHistory();
  });

  it('returns an error when submitResultsMultipart is called, without Test Execution related info', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/testng/multipart').reply(200, successfulResponseData);

    let reportConfig = { format: TESTNG_FORMAT };
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
    } catch (error) {
      expect(error._response).toEqual('ERROR: testExecInfoFile or testExecInfo must be defined');
    }
  });

  it('sends the correct payload when submitResultsMultipart is called with Test Execution info', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/testng/multipart').reply(200, successfulResponseData);

    let reportConfig = {
      format: TESTNG_FORMAT,
      testExecInfo: {
        "fields": {
            "project": {
                "key": "BOOK"
            },
            "summary": "Test Execution for some automated tests",
            "issuetype": {
                "name": "Test Execution"
            }
        }
    }
    
    }
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="file"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual('report.xml');
      expect(parts[0].type).toEqual('application/xml');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual('info.json');
      expect(parts[1].type).toEqual('application/json');
      expect(parts[1].data.toString('utf-8')).toEqual(reportConfig.testExecInfo.toString('utf-8'));
    } catch (error) {
        
        throw error;
    }
  });

  it('sends the correct payload when submitResultsMultipart is called with Test Execution info in a file', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/testng/multipart').reply(200, successfulResponseData);

    let reportConfig = {
      format: TESTNG_FORMAT,
      testExecInfoFile: '__tests__/resources/testExecInfo.json',
    }
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="file"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual('report.xml');
      expect(parts[0].type).toEqual('application/xml');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual('info.json');
      expect(parts[1].type).toEqual('application/json');
      expect(parts[1].data.toString('utf-8')).toEqual(fs.readFileSync(reportConfig.testExecInfoFile).toString('utf-8'));
    } catch (error) {
        
        throw error;
    }
  });

  it('sends the correct payload when submitResultsMultipart is called with Test Execution and Tests info from files', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/testng/multipart').reply(200, successfulResponseData);

    let reportConfig = {
      format: TESTNG_FORMAT,
      testInfoFile: '__tests__/resources/testInfo.json',
      testExecInfoFile: '__tests__/resources/testExecInfo.json'
    }
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(3);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="file"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="testInfo"'));

      expect(parts[0].filename).toEqual('report.xml');
      expect(parts[0].type).toEqual('application/xml');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual('info.json');
      expect(parts[1].type).toEqual('application/json');
      expect(parts[1].data.toString('utf-8')).toEqual(fs.readFileSync(reportConfig.testExecInfoFile).toString('utf-8'));
      expect(parts[2].filename).toEqual('testInfo.json');
      expect(parts[2].type).toEqual('application/json');
      expect(parts[2].data.toString('utf-8')).toEqual(fs.readFileSync(reportConfig.testInfoFile).toString('utf-8'));
    } catch (error) {
        
        throw error;
    }
  });

  it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/testng/multipart').reply(200, successfulResponseData);

        let reportConfig = {
          format: TESTNG_FORMAT,
          testInfoFile: '__tests__/resources/testInfo.json',
          testExecInfoFile: '__tests__/resources/testExecInfo.json'
        }
        try {
            let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
            expect(response._response.data).toEqual(successfulResponseData);
            expect(response.id).toEqual(successfulResponseData.testExecIssue.id);
            expect(response.key).toEqual(successfulResponseData.testExecIssue.key);
            expect(response.selfUrl).toEqual(successfulResponseData.testExecIssue.self);
        } catch (error) {
            
            throw error;
        }

    });
});

describe('Nunit multipart endpoint', () => {
  let mock;
  let xrayClient;
  let reportFile = '__tests__/resources/nunit.xml';
  const successfulResponseData = {
    "testExecIssue": {
      "id": "38101",
      "key": "CALC-82",
      "self": "http://xray.example.com/rest/api/2/issue/38101"
    },
    "testIssues": {
      "success": [
        {
          "self": "http://xray.example.com/rest/api/2/issue/36600",
          "id": "36600",
          "key": "CALC-1"
        }
      ]
    }
  }

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayServerSettings = {
      jiraBaseUrl: 'http://xray.example.com',
      jiraUsername: 'username',
      jiraPassword: 'password'
    }; 
    xrayClient = new XrayDatacenterClient(xrayServerSettings);
  });
  
  afterEach(() => {
    mock.resetHistory();
  });

  it('returns an error when submitResultsMultipart is called, without Test Execution related info', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/nunit/multipart').reply(200, successfulResponseData);

    let reportConfig = { format: NUNIT_FORMAT };
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
    } catch (error) {
      expect(error._response).toEqual('ERROR: testExecInfoFile or testExecInfo must be defined');
    }
  });

  it('sends the correct payload when submitResultsMultipart is called with Test Execution info', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/nunit/multipart').reply(200, successfulResponseData);

    let reportConfig = {
      format: NUNIT_FORMAT,
      testExecInfo: {
        "fields": {
            "project": {
                "key": "BOOK"
            },
            "summary": "Test Execution for some automated tests",
            "issuetype": {
                "name": "Test Execution"
            }
        }
    }
    
    }
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="file"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual('report.xml');
      expect(parts[0].type).toEqual('application/xml');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual('info.json');
      expect(parts[1].type).toEqual('application/json');
      expect(parts[1].data.toString('utf-8')).toEqual(reportConfig.testExecInfo.toString('utf-8'));
    } catch (error) {
        
        throw error;
    }
  });

  it('sends the correct payload when submitResultsMultipart is called with Test Execution info in a file', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/nunit/multipart').reply(200, successfulResponseData);

    let reportConfig = {
      format: NUNIT_FORMAT,
      testExecInfoFile: '__tests__/resources/testExecInfo.json',
    }
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="file"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual('report.xml');
      expect(parts[0].type).toEqual('application/xml');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual('info.json');
      expect(parts[1].type).toEqual('application/json');
      expect(parts[1].data.toString('utf-8')).toEqual(fs.readFileSync(reportConfig.testExecInfoFile).toString('utf-8'));
    } catch (error) {
        
        throw error;
    }
  });

  it('sends the correct payload when submitResultsMultipart is called with Test Execution and Tests info from files', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/nunit/multipart').reply(200, successfulResponseData);

    let reportConfig = {
      format: NUNIT_FORMAT,
      testInfoFile: '__tests__/resources/testInfo.json',
      testExecInfoFile: '__tests__/resources/testExecInfo.json'
    }
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(3);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="file"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="testInfo"'));

      expect(parts[0].filename).toEqual('report.xml');
      expect(parts[0].type).toEqual('application/xml');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual('info.json');
      expect(parts[1].type).toEqual('application/json');
      expect(parts[1].data.toString('utf-8')).toEqual(fs.readFileSync(reportConfig.testExecInfoFile).toString('utf-8'));
      expect(parts[2].filename).toEqual('testInfo.json');
      expect(parts[2].type).toEqual('application/json');
      expect(parts[2].data.toString('utf-8')).toEqual(fs.readFileSync(reportConfig.testInfoFile).toString('utf-8'));
    } catch (error) {
        
        throw error;
    }
  });

  it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/nunit/multipart').reply(200, successfulResponseData);

        let reportConfig = {
          format: NUNIT_FORMAT,
          testInfoFile: '__tests__/resources/testInfo.json',
          testExecInfoFile: '__tests__/resources/testExecInfo.json'
        }
        try {
            let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
            expect(response._response.data).toEqual(successfulResponseData);
            expect(response.id).toEqual(successfulResponseData.testExecIssue.id);
            expect(response.key).toEqual(successfulResponseData.testExecIssue.key);
            expect(response.selfUrl).toEqual(successfulResponseData.testExecIssue.self);
        } catch (error) {
            
            throw error;
        }

    });
});

describe('xunit multipart endpoint', () => {
  let mock;
  let xrayClient;
  let reportFile = '__tests__/resources/junit.xml';
  const successfulResponseData = {
    "testExecIssue": {
      "id": "38101",
      "key": "CALC-82",
      "self": "http://xray.example.com/rest/api/2/issue/38101"
    },
    "testIssues": {
      "success": [
        {
          "self": "http://xray.example.com/rest/api/2/issue/36600",
          "id": "36600",
          "key": "CALC-1"
        }
      ]
    }
  }

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayServerSettings = {
      jiraBaseUrl: 'http://xray.example.com',
      jiraUsername: 'username',
      jiraPassword: 'password'
    }; 
    xrayClient = new XrayDatacenterClient(xrayServerSettings);
  });
  
  afterEach(() => {
    mock.resetHistory();
  });

  it('returns an error when submitResultsMultipart is called, without Test Execution related info', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/junit/multipart').reply(200, successfulResponseData);

    let reportConfig = { format: JUNIT_FORMAT };
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
    } catch (error) {
      expect(error._response).toEqual('ERROR: testExecInfoFile or testExecInfo must be defined');
    }
  });

  it('sends the correct payload when submitResultsMultipart is called with Test Execution info', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/junit/multipart').reply(200, successfulResponseData);

    let reportConfig = {
      format: JUNIT_FORMAT,
      testExecInfo: {
        "fields": {
            "project": {
                "key": "BOOK"
            },
            "summary": "Test Execution for some automated tests",
            "issuetype": {
                "name": "Test Execution"
            }
        }
    }
    
    }
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="file"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual('report.xml');
      expect(parts[0].type).toEqual('application/xml');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual('info.json');
      expect(parts[1].type).toEqual('application/json');
      expect(parts[1].data.toString('utf-8')).toEqual(reportConfig.testExecInfo.toString('utf-8'));
    } catch (error) {
        
        throw error;
    }
  });

  it('sends the correct payload when submitResultsMultipart is called with Test Execution info in a file', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/junit/multipart').reply(200, successfulResponseData);

    let reportConfig = {
      format: JUNIT_FORMAT,
      testExecInfoFile: '__tests__/resources/testExecInfo.json',
    }
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="file"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual('report.xml');
      expect(parts[0].type).toEqual('application/xml');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual('info.json');
      expect(parts[1].type).toEqual('application/json');
      expect(parts[1].data.toString('utf-8')).toEqual(fs.readFileSync(reportConfig.testExecInfoFile).toString('utf-8'));
    } catch (error) {
        
        throw error;
    }
  });

  it('sends the correct payload when submitResultsMultipart is called with Test Execution and Tests info from files', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/junit/multipart').reply(200, successfulResponseData);

    let reportConfig = {
      format: JUNIT_FORMAT,
      testInfoFile: '__tests__/resources/testInfo.json',
      testExecInfoFile: '__tests__/resources/testExecInfo.json'
    }
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(3);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="file"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="testInfo"'));

      expect(parts[0].filename).toEqual('report.xml');
      expect(parts[0].type).toEqual('application/xml');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual('info.json');
      expect(parts[1].type).toEqual('application/json');
      expect(parts[1].data.toString('utf-8')).toEqual(fs.readFileSync(reportConfig.testExecInfoFile).toString('utf-8'));
      expect(parts[2].filename).toEqual('testInfo.json');
      expect(parts[2].type).toEqual('application/json');
      expect(parts[2].data.toString('utf-8')).toEqual(fs.readFileSync(reportConfig.testInfoFile).toString('utf-8'));
    } catch (error) {
        
        throw error;
    }
  });

  it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/junit/multipart').reply(200, successfulResponseData);

        let reportConfig = {
          format: JUNIT_FORMAT,
          testInfoFile: '__tests__/resources/testInfo.json',
          testExecInfoFile: '__tests__/resources/testExecInfo.json'
        }
        try {
            let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
            expect(response._response.data).toEqual(successfulResponseData);
            expect(response.id).toEqual(successfulResponseData.testExecIssue.id);
            expect(response.key).toEqual(successfulResponseData.testExecIssue.key);
            expect(response.selfUrl).toEqual(successfulResponseData.testExecIssue.self);
        } catch (error) {
            
            throw error;
        }

    });
});

describe('Robot Framework multipart endpoint', () => {
  let mock;
  let xrayClient;
  let reportFile = '__tests__/resources/robot.xml';
  const successfulResponseData = {
    "testExecIssue": {
      "id": "38101",
      "key": "CALC-82",
      "self": "http://xray.example.com/rest/api/2/issue/38101"
    },
    "testIssues": {
      "success": [
        {
          "self": "http://xray.example.com/rest/api/2/issue/36600",
          "id": "36600",
          "key": "CALC-1"
        }
      ]
    }
  }

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayServerSettings = {
      jiraBaseUrl: 'http://xray.example.com',
      jiraUsername: 'username',
      jiraPassword: 'password'
    }; 
    xrayClient = new XrayDatacenterClient(xrayServerSettings);
  });
  
  afterEach(() => {
    mock.resetHistory();
  });

  it('returns an error when submitResultsMultipart is called, without Test Execution related info', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/robot/multipart').reply(200, successfulResponseData);

    let reportConfig = { format: ROBOT_FORMAT };
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
    } catch (error) {
      expect(error._response).toEqual('ERROR: testExecInfoFile or testExecInfo must be defined');
    }
  });

  it('sends the correct payload when submitResultsMultipart is called with Test Execution info', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/robot/multipart').reply(200, successfulResponseData);

    let reportConfig = {
      format: ROBOT_FORMAT,
      testExecInfo: {
        "fields": {
            "project": {
                "key": "BOOK"
            },
            "summary": "Test Execution for some automated tests",
            "issuetype": {
                "name": "Test Execution"
            }
        }
    }
    
    }
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="file"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual('report.xml');
      expect(parts[0].type).toEqual('application/xml');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual('info.json');
      expect(parts[1].type).toEqual('application/json');
      expect(parts[1].data.toString('utf-8')).toEqual(reportConfig.testExecInfo.toString('utf-8'));
    } catch (error) {
        
        throw error;
    }
  });

  it('sends the correct payload when submitResultsMultipart is called with Test Execution info in a file', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/robot/multipart').reply(200, successfulResponseData);

    let reportConfig = {
      format: ROBOT_FORMAT,
      testExecInfoFile: '__tests__/resources/testExecInfo.json',
    }
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="file"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual('report.xml');
      expect(parts[0].type).toEqual('application/xml');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual('info.json');
      expect(parts[1].type).toEqual('application/json');
      expect(parts[1].data.toString('utf-8')).toEqual(fs.readFileSync(reportConfig.testExecInfoFile).toString('utf-8'));
    } catch (error) {
        
        throw error;
    }
  });

  it('sends the correct payload when submitResultsMultipart is called with Test Execution and Tests info from files', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/robot/multipart').reply(200, successfulResponseData);

    let reportConfig = {
      format: ROBOT_FORMAT,
      testInfoFile: '__tests__/resources/testInfo.json',
      testExecInfoFile: '__tests__/resources/testExecInfo.json'
    }
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(3);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="file"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="testInfo"'));

      expect(parts[0].filename).toEqual('report.xml');
      expect(parts[0].type).toEqual('application/xml');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual('info.json');
      expect(parts[1].type).toEqual('application/json');
      expect(parts[1].data.toString('utf-8')).toEqual(fs.readFileSync(reportConfig.testExecInfoFile).toString('utf-8'));
      expect(parts[2].filename).toEqual('testInfo.json');
      expect(parts[2].type).toEqual('application/json');
      expect(parts[2].data.toString('utf-8')).toEqual(fs.readFileSync(reportConfig.testInfoFile).toString('utf-8'));
    } catch (error) {
        
        throw error;
    }
  });

  it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/robot/multipart').reply(200, successfulResponseData);

        let reportConfig = {
          format: ROBOT_FORMAT,
          testInfoFile: '__tests__/resources/testInfo.json',
          testExecInfoFile: '__tests__/resources/testExecInfo.json'
        }
        try {
            let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
            expect(response._response.data).toEqual(successfulResponseData);
            expect(response.id).toEqual(successfulResponseData.testExecIssue.id);
            expect(response.key).toEqual(successfulResponseData.testExecIssue.key);
            expect(response.selfUrl).toEqual(successfulResponseData.testExecIssue.self);
        } catch (error) {
            
            throw error;
        }

    });
});

describe('Cucumber multipart endpoint', () => {
  let mock;
  let xrayClient;
  let reportFile = '__tests__/resources/cucumber.json';
  const successfulResponseData = {
    "testExecIssue": {
      "id": "38101",
      "key": "CALC-82",
      "self": "http://xray.example.com/rest/api/2/issue/38101"
    },
    "testIssues": {
      "success": [
        {
          "self": "http://xray.example.com/rest/api/2/issue/36600",
          "id": "36600",
          "key": "CALC-1"
        }
      ]
    }
  }

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayServerSettings = {
      jiraBaseUrl: 'http://xray.example.com',
      jiraUsername: 'username',
      jiraPassword: 'password'
    }; 
    xrayClient = new XrayDatacenterClient(xrayServerSettings);
  });
  
  afterEach(() => {
    mock.resetHistory();
  });

  it('returns an error when submitResultsMultipart is called, without Test Execution related info', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/cucumber/multipart').reply(200, successfulResponseData);

    let reportConfig = { format: CUCUMBER_FORMAT };
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
    } catch (error) {
      expect(error._response).toEqual('ERROR: testExecInfoFile or testExecInfo must be defined');
    }
  });

  it('sends the correct payload when submitResultsMultipart is called with Test Execution info', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/cucumber/multipart').reply(200, successfulResponseData);

    let reportConfig = {
      format: CUCUMBER_FORMAT,
      testExecInfo: {
        "fields": {
            "project": {
                "key": "BOOK"
            },
            "summary": "Test Execution for some automated tests",
            "issuetype": {
                "name": "Test Execution"
            }
        }
    }
    
    }
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="result"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual('report.json');
      expect(parts[0].type).toEqual('application/json');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual('info.json');
      expect(parts[1].type).toEqual('application/json');
      expect(parts[1].data.toString('utf-8')).toEqual(reportConfig.testExecInfo.toString('utf-8'));
    } catch (error) {
        
        throw error;
    }
  });

  it('sends the correct payload when submitResultsMultipart is called with Test Execution info in a file', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/cucumber/multipart').reply(200, successfulResponseData);

    let reportConfig = {
      format: CUCUMBER_FORMAT,
      testExecInfoFile: '__tests__/resources/testExecInfo.json',
    }
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="result"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual('report.json');
      expect(parts[0].type).toEqual('application/json');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual('info.json');
      expect(parts[1].type).toEqual('application/json');
      expect(parts[1].data.toString('utf-8')).toEqual(fs.readFileSync(reportConfig.testExecInfoFile).toString('utf-8'));
    } catch (error) {
        
        throw error;
    }
  });

  it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/cucumber/multipart').reply(200, successfulResponseData);

        let reportConfig = {
          format: CUCUMBER_FORMAT,
          testInfoFile: '__tests__/resources/testInfo.json',
          testExecInfoFile: '__tests__/resources/testExecInfo.json'
        }
        try {
            let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
            expect(response._response.data).toEqual(successfulResponseData);
            expect(response.id).toEqual(successfulResponseData.testExecIssue.id);
            expect(response.key).toEqual(successfulResponseData.testExecIssue.key);
            expect(response.selfUrl).toEqual(successfulResponseData.testExecIssue.self);
        } catch (error) {
            
            throw error;
        }

    });
});

describe('Behave multipart endpoint', () => {
  let mock;
  let xrayClient;
  let reportFile = '__tests__/resources/behave.json';
  const successfulResponseData = {
    "testExecIssue": {
      "id": "38101",
      "key": "CALC-82",
      "self": "http://xray.example.com/rest/api/2/issue/38101"
    },
    "testIssues": {
      "success": [
        {
          "self": "http://xray.example.com/rest/api/2/issue/36600",
          "id": "36600",
          "key": "CALC-1"
        }
      ]
    }
  }

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayServerSettings = {
      jiraBaseUrl: 'http://xray.example.com',
      jiraUsername: 'username',
      jiraPassword: 'password'
    }; 
    xrayClient = new XrayDatacenterClient(xrayServerSettings);
  });
  
  afterEach(() => {
    mock.resetHistory();
  });

  it('returns an error when submitResultsMultipart is called, without Test Execution related info', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/behave/multipart').reply(200, successfulResponseData);

    let reportConfig = { format: BEHAVE_FORMAT };
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
    } catch (error) {
      expect(error._response).toEqual('ERROR: testExecInfoFile or testExecInfo must be defined');
    }
  });

  it('sends the correct payload when submitResultsMultipart is called with Test Execution info', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/behave/multipart').reply(200, successfulResponseData);

    let reportConfig = {
      format: BEHAVE_FORMAT,
      testExecInfo: {
        "fields": {
            "project": {
                "key": "BOOK"
            },
            "summary": "Test Execution for some automated tests",
            "issuetype": {
                "name": "Test Execution"
            }
        }
    }
    
    }
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="result"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual('report.json');
      expect(parts[0].type).toEqual('application/json');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual('info.json');
      expect(parts[1].type).toEqual('application/json');
      expect(parts[1].data.toString('utf-8')).toEqual(reportConfig.testExecInfo.toString('utf-8'));
    } catch (error) {
        
        throw error;
    }
  });

  it('sends the correct payload when submitResultsMultipart is called with Test Execution info in a file', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/behave/multipart').reply(200, successfulResponseData);

    let reportConfig = {
      format: BEHAVE_FORMAT,
      testExecInfoFile: '__tests__/resources/testExecInfo.json',
    }
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="result"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual('report.json');
      expect(parts[0].type).toEqual('application/json');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual('info.json');
      expect(parts[1].type).toEqual('application/json');
      expect(parts[1].data.toString('utf-8')).toEqual(fs.readFileSync(reportConfig.testExecInfoFile).toString('utf-8'));
    } catch (error) {
        
        throw error;
    }
  });

  it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/behave/multipart').reply(200, successfulResponseData);

        let reportConfig = {
          format: BEHAVE_FORMAT,
          testInfoFile: '__tests__/resources/testInfo.json',
          testExecInfoFile: '__tests__/resources/testExecInfo.json'
        }
        try {
            let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
            expect(response._response.data).toEqual(successfulResponseData);
            expect(response.id).toEqual(successfulResponseData.testExecIssue.id);
            expect(response.key).toEqual(successfulResponseData.testExecIssue.key);
            expect(response.selfUrl).toEqual(successfulResponseData.testExecIssue.self);
        } catch (error) {
            
            throw error;
        }

    });
});

describe('Xray JSON multipart endpoint', () => {
  let mock;
  let xrayClient;
  let reportFile = '__tests__/resources/xray_server.json';
  const successfulResponseData = {
    "testExecIssue": {
      "id": "38101",
      "key": "CALC-82",
      "self": "http://xray.example.com/rest/api/2/issue/38101"
    },
    "testIssues": {
      "success": [
        {
          "self": "http://xray.example.com/rest/api/2/issue/36600",
          "id": "36600",
          "key": "CALC-1"
        }
      ]
    }
  }

  beforeEach(() => {
    mock = new MockAdapter(axios);
    const xrayServerSettings = {
      jiraBaseUrl: 'http://xray.example.com',
      jiraUsername: 'username',
      jiraPassword: 'password'
    }; 
    xrayClient = new XrayDatacenterClient(xrayServerSettings);
  });
  
  afterEach(() => {
    mock.resetHistory();
  });

  it('returns an error when submitResultsMultipart is called, without Test Execution related info', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/multipart').reply(200, successfulResponseData);

    let reportConfig = { format: XRAY_FORMAT };
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
    } catch (error) {
      expect(error._response).toEqual('ERROR: testExecInfoFile or testExecInfo must be defined');
    }
  });

  it('sends the correct payload when submitResultsMultipart is called with Test Execution info', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/multipart').reply(200, successfulResponseData);

    let reportConfig = {
      format: XRAY_FORMAT,
      testExecInfo: {
        "fields": {
            "project": {
                "key": "BOOK"
            },
            "summary": "Test Execution for some automated tests",
            "issuetype": {
                "name": "Test Execution"
            }
        }
    }
    
    }
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="result"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual('report.json');
      expect(parts[0].type).toEqual('application/json');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual('info.json');
      expect(parts[1].type).toEqual('application/json');
      expect(parts[1].data.toString('utf-8')).toEqual(reportConfig.testExecInfo.toString('utf-8'));
    } catch (error) {
        throw error;
    }
  });

  it('sends the correct payload when submitResultsMultipart is called with Test Execution info in a file', async() => {
    mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/multipart').reply(200, successfulResponseData);

    let reportConfig = {
      format: XRAY_FORMAT,
      testExecInfoFile: '__tests__/resources/testExecInfo.json',
    }
    try {
      let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);

      expect(mock.history.post.length).toBe(1);
      const rawFormData = mock.history.post[0].data.getBuffer().toString('utf-8');
      const boundary = mock.history.post[0].data.getBoundary();
      const parts = multipart.parse(Buffer.from(rawFormData), boundary);
      expect(parts.length).toBe(2);

      // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
      // and only assigns "filename" on the returned parsed part.
      // besides, it assumes "name" and "filename" appear in this exact order on the header
      expect(rawFormData).toEqual(expect.stringContaining(' name="result"'));
      expect(rawFormData).toEqual(expect.stringContaining(' name="info"'));

      expect(parts[0].filename).toEqual('report.json');
      expect(parts[0].type).toEqual('application/json');
      let reportContent = fs.readFileSync(reportFile).toString('utf-8');
      let partContent = parts[0].data.toString('utf-8')
      expect(partContent).toEqual(reportContent);
      expect(parts[1].filename).toEqual('info.json');
      expect(parts[1].type).toEqual('application/json');
      expect(parts[1].data.toString('utf-8')).toEqual(fs.readFileSync(reportConfig.testExecInfoFile).toString('utf-8'));
    } catch (error) {
        throw error;
    }
  });

  it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost('http://xray.example.com/rest/raven/2.0/import/execution/multipart').reply(200, successfulResponseData);

        let reportConfig = {
          format: XRAY_FORMAT,
          testInfoFile: '__tests__/resources/testInfo.json',
          testExecInfoFile: '__tests__/resources/testExecInfo.json'
        }
        try {
            let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
            expect(response._response.data).toEqual(successfulResponseData);
            expect(response.id).toEqual(successfulResponseData.testExecIssue.id);
            expect(response.key).toEqual(successfulResponseData.testExecIssue.key);
            expect(response.selfUrl).toEqual(successfulResponseData.testExecIssue.self);
        } catch (error) {
            
            throw error;
        }

    });
});