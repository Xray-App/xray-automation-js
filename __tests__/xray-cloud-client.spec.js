import {describe, expect, it, afterEach, beforeEach} from '@jest/globals'
import axios from 'axios';
import nock from 'nock';
import fs from 'fs';
import MockAdapter from 'axios-mock-adapter';
import multipart from 'parse-multipart-data';

import XrayCloudClient from '../src/xray-cloud-client.js';
//import XrayErrorResponse from '../src/xray-error-response.js';
//import XrayCloudResponseV2 from '../src/xray-cloud-response-v2.js';
//import XrayCloudGraphQLResponseV2 from '../src/xray-cloud-graphql-response-v2.js';
import { XRAY_FORMAT, JUNIT_FORMAT, TESTNG_FORMAT, ROBOT_FORMAT, NUNIT_FORMAT, XUNIT_FORMAT, CUCUMBER_FORMAT } from '../src/index.js';

const xrayCloudBaseUrl = "https://xray.cloud.getxray.app/api/v2";        
const authenticateUrl = xrayCloudBaseUrl + "/authenticate";

describe('authentication', () => {
    let mock;
    let xrayClient;
    let reportFile = '__tests__/resources/junit.xml';
    const successfulAuthResponseData = '"dXNlcm5hbWU6cGFzc3dvcmQ="';
    const invalidAuthResponseData = {"error":"Authentication failed. Invalid client credentials!"};
  
    beforeEach(() => {
      mock = new MockAdapter(axios);
    });
    
    afterEach(() => {
      mock.resetHistory();
    });
  
    it('is made implicitly with success and proceeds, when using submitRequest', async() => {
        mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData );
        mock.onPost(xrayCloudBaseUrl + '/import/execution/junit?projectKey=CALC').reply(200, {});
  
        const xrayCloudSettings = {
            clientId: '0000000000',
            clientSecret: '1111111111'
          }; 
        xrayClient = new XrayCloudClient(xrayCloudSettings);
        
        let reportConfig = {
          format: JUNIT_FORMAT,
          projectKey: 'CALC'
        }
        try {
            let response = await xrayClient.submitResults(reportFile, reportConfig);
            expect(mock.history.post.length).toBe(2);
            expect(mock.history.post[0].data).toEqual("{\"client_id\":\"0000000000\",\"client_secret\":\"1111111111\"}");
            expect(mock.history.post[1].headers['Authorization']).toEqual("Bearer dXNlcm5hbWU6cGFzc3dvcmQ=")
        } catch (error) {
            throw error;
        }
    });
  
    it('is made implicitly and gives an error for invalid credentials, when using submitRequest', async() => {
        mock.onPost(authenticateUrl).reply(401, invalidAuthResponseData );
        mock.onPost(xrayCloudBaseUrl + '/import/execution/junit?projectKey=CALC').reply(200, {});
  
        const xrayCloudSettings = {
            clientId: '0000000000',
            clientSecret: '1111111111'
          }; 
        xrayClient = new XrayCloudClient(xrayCloudSettings);
        
        let reportConfig = {
          format: JUNIT_FORMAT,
          projectKey: 'CALC'
        }
        try {
            let response = await xrayClient.submitResults(reportFile, reportConfig);
        } catch (error) {
            expect(mock.history.post[0].data).toEqual("{\"client_id\":\"0000000000\",\"client_secret\":\"1111111111\"}");
            expect(mock.history.post.length).toBe(1);
            expect(error.statusCode).toEqual(401);
            expect(error.body).toEqual(invalidAuthResponseData);
        }
    });
});

describe('invalid request for some report file', () => {
    let mock;
    let xrayClient;
    let reportFile = '__tests__/resources/dummy.xml';
  
    beforeEach(() => {
      mock = new MockAdapter(axios);
      const xrayCloudSettings = {
        clientId: '0000000000',
        clientSecret: '1111111111'
      }; 
      xrayClient = new XrayCloudClient(xrayCloudSettings);
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
    const successfulAuthResponseData = '"1234567890"';
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
      const xrayCloudSettings = {
        clientId: '0000000000',
        clientSecret: '1111111111'
      }; 
      xrayClient = new XrayCloudClient(xrayCloudSettings);

      mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData );
    });
    
    afterEach(() => {
      mock.resetHistory();
    });
  
    it('returns an error when submitResults is called, without projectKey or testExecKey', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/junit').reply(200, successfulResponseData);
  
      let reportConfig = { format: JUNIT_FORMAT };
      try {
        let response = await xrayClient.submitResults(reportFile, reportConfig);
      } catch (error) {
        expect(error._response).toEqual('ERROR: projectKey or testExecKey must be defined');
      }
    });
 
    it('sends the correct URL encoded parameters when submitResults is called', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/junit?projectKey=CALC&testPlanKey=CALC-10&testExecKey=CALC-82&fixVersion=1.0&revision=123&testEnvironments=chrome').reply(200, successfulResponseData);
  
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
          console.log(error);
          throw error;
      }
    });
  
    it('sends the correct URL encoded parameters, for multiple testEnvironments, when submitResults is called', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/junit?projectKey=CALC&testPlanKey=CALC-10&testExecKey=CALC-82&fixVersion=1.0&revision=123&testEnvironments=chrome%3Bmac').reply(200, successfulResponseData);
  
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
          console.log(error);
          throw error;
      }
    });
     
    it('sends the correct payload when submitResults is called', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/junit?projectKey=CALC').reply(200, successfulResponseData);
  
      let reportConfig = {
        format: JUNIT_FORMAT,
        projectKey: 'CALC'
      }
      try {
        let response = await xrayClient.submitResults(reportFile, reportConfig);
  
        expect(mock.history.post.length).toBe(2);
        expect(mock.history.post[1].headers['Content-Type']).toEqual('application/xml');
        let reportContent = fs.readFileSync(reportFile).toString('utf-8');
        expect(mock.history.post[1].data).toEqual(reportContent);
      } catch (error) {
          console.log(error);
          throw error;
      }
    });
  
    it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost(xrayCloudBaseUrl + '/import/execution/junit?projectKey=CALC').reply(200, successfulResponseData);
  
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
            console.log(error);
            throw error;
        }
  
      });

});

describe('JUnit standard endpoint', () => {
    let mock;
    let xrayClient;
    let reportFile = '__tests__/resources/junit.xml';
    const successfulAuthResponseData = '"1234567890"';
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
      const xrayCloudSettings = {
        clientId: '0000000000',
        clientSecret: '1111111111'
      }; 
      xrayClient = new XrayCloudClient(xrayCloudSettings);

      mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData );
    });
    
    afterEach(() => {
      mock.resetHistory();
    });
  
    it('returns an error when submitResults is called, without projectKey or testExecKey', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/junit').reply(200, successfulResponseData);
  
      let reportConfig = { format: JUNIT_FORMAT };
      try {
        let response = await xrayClient.submitResults(reportFile, reportConfig);
      } catch (error) {
        expect(error._response).toEqual('ERROR: projectKey or testExecKey must be defined');
      }
    });
 
    it('sends the correct URL encoded parameters when submitResults is called', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/junit?projectKey=CALC&testPlanKey=CALC-10&testExecKey=CALC-82&fixVersion=1.0&revision=123&testEnvironments=chrome').reply(200, successfulResponseData);
  
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
          console.log(error);
          throw error;
      }
    });
  
    it('sends the correct URL encoded parameters, for multiple testEnvironments, when submitResults is called', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/junit?projectKey=CALC&testPlanKey=CALC-10&testExecKey=CALC-82&fixVersion=1.0&revision=123&testEnvironments=chrome%3Bmac').reply(200, successfulResponseData);
  
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
          console.log(error);
          throw error;
      }
    });
     
    it('sends the correct payload when submitResults is called', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/junit?projectKey=CALC').reply(200, successfulResponseData);
  
      let reportConfig = {
        format: JUNIT_FORMAT,
        projectKey: 'CALC'
      }
      try {
        let response = await xrayClient.submitResults(reportFile, reportConfig);
  
        expect(mock.history.post.length).toBe(2);
        expect(mock.history.post[1].headers['Content-Type']).toEqual('application/xml');
        let reportContent = fs.readFileSync(reportFile).toString('utf-8');
        expect(mock.history.post[1].data).toEqual(reportContent);
      } catch (error) {
          console.log(error);
          throw error;
      }
    });
  
    it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost(xrayCloudBaseUrl + '/import/execution/junit?projectKey=CALC').reply(200, successfulResponseData);
  
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
            console.log(error);
            throw error;
        }
  
      });

});

describe('TestNG standard endpoint', () => {
    let mock;
    let xrayClient;
    let reportFile = '__tests__/resources/testng.xml';
    const successfulAuthResponseData = '"1234567890"';
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
      const xrayCloudSettings = {
        clientId: '0000000000',
        clientSecret: '1111111111'
      }; 
      xrayClient = new XrayCloudClient(xrayCloudSettings);

      mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData );
    });
    
    afterEach(() => {
      mock.resetHistory();
    });
  
    it('returns an error when submitResults is called, without projectKey or testExecKey', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/testng').reply(200, successfulResponseData);
  
      let reportConfig = { format: TESTNG_FORMAT };
      try {
        let response = await xrayClient.submitResults(reportFile, reportConfig);
      } catch (error) {
        expect(error._response).toEqual('ERROR: projectKey or testExecKey must be defined');
      }
    });
 
    it('sends the correct URL encoded parameters when submitResults is called', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/testng?projectKey=CALC&testPlanKey=CALC-10&testExecKey=CALC-82&fixVersion=1.0&revision=123&testEnvironments=chrome').reply(200, successfulResponseData);
  
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
          console.log(error);
          throw error;
      }
    });
  
    it('sends the correct URL encoded parameters, for multiple testEnvironments, when submitResults is called', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/testng?projectKey=CALC&testPlanKey=CALC-10&testExecKey=CALC-82&fixVersion=1.0&revision=123&testEnvironments=chrome%3Bmac').reply(200, successfulResponseData);
  
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
          console.log(error);
          throw error;
      }
    });
     
    it('sends the correct payload when submitResults is called', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/testng?projectKey=CALC').reply(200, successfulResponseData);
  
      let reportConfig = {
        format: TESTNG_FORMAT,
        projectKey: 'CALC'
      }
      try {
        let response = await xrayClient.submitResults(reportFile, reportConfig);
  
        expect(mock.history.post.length).toBe(2);
        expect(mock.history.post[1].headers['Content-Type']).toEqual('application/xml');
        let reportContent = fs.readFileSync(reportFile).toString('utf-8');
        expect(mock.history.post[1].data).toEqual(reportContent);
      } catch (error) {
          console.log(error);
          throw error;
      }
    });
  
    it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost(xrayCloudBaseUrl + '/import/execution/testng?projectKey=CALC').reply(200, successfulResponseData);
  
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
            console.log(error);
            throw error;
        }
  
      });

});

describe('Nunit standard endpoint', () => {
    let mock;
    let xrayClient;
    let reportFile = '__tests__/resources/nunit.xml';
    const successfulAuthResponseData = '"1234567890"';
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
      const xrayCloudSettings = {
        clientId: '0000000000',
        clientSecret: '1111111111'
      }; 
      xrayClient = new XrayCloudClient(xrayCloudSettings);

      mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData );
    });
    
    afterEach(() => {
      mock.resetHistory();
    });
  
    it('returns an error when submitResults is called, without projectKey or testExecKey', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/nunit').reply(200, successfulResponseData);
  
      let reportConfig = { format: NUNIT_FORMAT };
      try {
        let response = await xrayClient.submitResults(reportFile, reportConfig);
      } catch (error) {
        expect(error._response).toEqual('ERROR: projectKey or testExecKey must be defined');
      }
    });
 
    it('sends the correct URL encoded parameters when submitResults is called', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/nunit?projectKey=CALC&testPlanKey=CALC-10&testExecKey=CALC-82&fixVersion=1.0&revision=123&testEnvironments=chrome').reply(200, successfulResponseData);
  
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
          console.log(error);
          throw error;
      }
    });
  
    it('sends the correct URL encoded parameters, for multiple testEnvironments, when submitResults is called', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/nunit?projectKey=CALC&testPlanKey=CALC-10&testExecKey=CALC-82&fixVersion=1.0&revision=123&testEnvironments=chrome%3Bmac').reply(200, successfulResponseData);
  
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
          console.log(error);
          throw error;
      }
    });
     
    it('sends the correct payload when submitResults is called', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/nunit?projectKey=CALC').reply(200, successfulResponseData);
  
      let reportConfig = {
        format: NUNIT_FORMAT,
        projectKey: 'CALC'
      }
      try {
        let response = await xrayClient.submitResults(reportFile, reportConfig);
  
        expect(mock.history.post.length).toBe(2);
        expect(mock.history.post[1].headers['Content-Type']).toEqual('application/xml');
        let reportContent = fs.readFileSync(reportFile).toString('utf-8');
        expect(mock.history.post[1].data).toEqual(reportContent);
      } catch (error) {
          console.log(error);
          throw error;
      }
    });
  
    it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost(xrayCloudBaseUrl + '/import/execution/nunit?projectKey=CALC').reply(200, successfulResponseData);
  
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
            console.log(error);
            throw error;
        }
  
      });

});

describe('Nunit standard endpoint', () => {
    let mock;
    let xrayClient;
    let reportFile = '__tests__/resources/nunit.xml';
    const successfulAuthResponseData = '"1234567890"';
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
      const xrayCloudSettings = {
        clientId: '0000000000',
        clientSecret: '1111111111'
      }; 
      xrayClient = new XrayCloudClient(xrayCloudSettings);

      mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData );
    });
    
    afterEach(() => {
      mock.resetHistory();
    });
  
    it('returns an error when submitResults is called, without projectKey or testExecKey', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/nunit').reply(200, successfulResponseData);
  
      let reportConfig = { format: NUNIT_FORMAT };
      try {
        let response = await xrayClient.submitResults(reportFile, reportConfig);
      } catch (error) {
        expect(error._response).toEqual('ERROR: projectKey or testExecKey must be defined');
      }
    });
 
    it('sends the correct URL encoded parameters when submitResults is called', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/nunit?projectKey=CALC&testPlanKey=CALC-10&testExecKey=CALC-82&fixVersion=1.0&revision=123&testEnvironments=chrome').reply(200, successfulResponseData);
  
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
          console.log(error);
          throw error;
      }
    });
  
    it('sends the correct URL encoded parameters, for multiple testEnvironments, when submitResults is called', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/nunit?projectKey=CALC&testPlanKey=CALC-10&testExecKey=CALC-82&fixVersion=1.0&revision=123&testEnvironments=chrome%3Bmac').reply(200, successfulResponseData);
  
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
          console.log(error);
          throw error;
      }
    });
     
    it('sends the correct payload when submitResults is called', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/nunit?projectKey=CALC').reply(200, successfulResponseData);
  
      let reportConfig = {
        format: NUNIT_FORMAT,
        projectKey: 'CALC'
      }
      try {
        let response = await xrayClient.submitResults(reportFile, reportConfig);
  
        expect(mock.history.post.length).toBe(2);
        expect(mock.history.post[1].headers['Content-Type']).toEqual('application/xml');
        let reportContent = fs.readFileSync(reportFile).toString('utf-8');
        expect(mock.history.post[1].data).toEqual(reportContent);
      } catch (error) {
          console.log(error);
          throw error;
      }
    });
  
    it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost(xrayCloudBaseUrl + '/import/execution/nunit?projectKey=CALC').reply(200, successfulResponseData);
  
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
            console.log(error);
            throw error;
        }
  
      });

});

describe('xunit standard endpoint', () => {
    let mock;
    let xrayClient;
    let reportFile = '__tests__/resources/xunit.xml';
    const successfulAuthResponseData = '"1234567890"';
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
      const xrayCloudSettings = {
        clientId: '0000000000',
        clientSecret: '1111111111'
      }; 
      xrayClient = new XrayCloudClient(xrayCloudSettings);

      mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData );
    });
    
    afterEach(() => {
      mock.resetHistory();
    });
  
    it('returns an error when submitResults is called, without projectKey or testExecKey', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/xunit').reply(200, successfulResponseData);
  
      let reportConfig = { format: XUNIT_FORMAT };
      try {
        let response = await xrayClient.submitResults(reportFile, reportConfig);
      } catch (error) {
        expect(error._response).toEqual('ERROR: projectKey or testExecKey must be defined');
      }
    });
 
    it('sends the correct URL encoded parameters when submitResults is called', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/xunit?projectKey=CALC&testPlanKey=CALC-10&testExecKey=CALC-82&fixVersion=1.0&revision=123&testEnvironments=chrome').reply(200, successfulResponseData);
  
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
          console.log(error);
          throw error;
      }
    });
  
    it('sends the correct URL encoded parameters, for multiple testEnvironments, when submitResults is called', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/xunit?projectKey=CALC&testPlanKey=CALC-10&testExecKey=CALC-82&fixVersion=1.0&revision=123&testEnvironments=chrome%3Bmac').reply(200, successfulResponseData);
  
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
          console.log(error);
          throw error;
      }
    });
     
    it('sends the correct payload when submitResults is called', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/xunit?projectKey=CALC').reply(200, successfulResponseData);
  
      let reportConfig = {
        format: XUNIT_FORMAT,
        projectKey: 'CALC'
      }
      try {
        let response = await xrayClient.submitResults(reportFile, reportConfig);
  
        expect(mock.history.post.length).toBe(2);
        expect(mock.history.post[1].headers['Content-Type']).toEqual('application/xml');
        let reportContent = fs.readFileSync(reportFile).toString('utf-8');
        expect(mock.history.post[1].data).toEqual(reportContent);
      } catch (error) {
          console.log(error);
          throw error;
      }
    });
  
    it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost(xrayCloudBaseUrl + '/import/execution/xunit?projectKey=CALC').reply(200, successfulResponseData);
  
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
            console.log(error);
            throw error;
        }
  
      });

});

describe('Robot Framework standard endpoint', () => {
    let mock;
    let xrayClient;
    let reportFile = '__tests__/resources/robot.xml';
    const successfulAuthResponseData = '"1234567890"';
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
      const xrayCloudSettings = {
        clientId: '0000000000',
        clientSecret: '1111111111'
      }; 
      xrayClient = new XrayCloudClient(xrayCloudSettings);

      mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData );
    });
    
    afterEach(() => {
      mock.resetHistory();
    });
  
    it('returns an error when submitResults is called, without projectKey or testExecKey', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/robot').reply(200, successfulResponseData);
  
      let reportConfig = { format: ROBOT_FORMAT };
      try {
        let response = await xrayClient.submitResults(reportFile, reportConfig);
      } catch (error) {
        expect(error._response).toEqual('ERROR: projectKey or testExecKey must be defined');
      }
    });
 
    it('sends the correct URL encoded parameters when submitResults is called', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/robot?projectKey=CALC&testPlanKey=CALC-10&testExecKey=CALC-82&fixVersion=1.0&revision=123&testEnvironments=chrome').reply(200, successfulResponseData);
  
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
          console.log(error);
          throw error;
      }
    });
  
    it('sends the correct URL encoded parameters, for multiple testEnvironments, when submitResults is called', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/robot?projectKey=CALC&testPlanKey=CALC-10&testExecKey=CALC-82&fixVersion=1.0&revision=123&testEnvironments=chrome%3Bmac').reply(200, successfulResponseData);
  
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
          console.log(error);
          throw error;
      }
    });
     
    it('sends the correct payload when submitResults is called', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/robot?projectKey=CALC').reply(200, successfulResponseData);
  
      let reportConfig = {
        format: ROBOT_FORMAT,
        projectKey: 'CALC'
      }
      try {
        let response = await xrayClient.submitResults(reportFile, reportConfig);
  
        expect(mock.history.post.length).toBe(2);
        expect(mock.history.post[1].headers['Content-Type']).toEqual('application/xml');
        let reportContent = fs.readFileSync(reportFile).toString('utf-8');
        expect(mock.history.post[1].data).toEqual(reportContent);
      } catch (error) {
          console.log(error);
          throw error;
      }
    });
  
    it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost(xrayCloudBaseUrl + '/import/execution/robot?projectKey=CALC').reply(200, successfulResponseData);
  
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
            console.log(error);
            throw error;
        }
  
      });

});

describe('Cucumber standard endpoint', () => {
    let mock;
    let xrayClient;
    let reportFile = '__tests__/resources/cucumber.json';
    const successfulAuthResponseData = '"1234567890"';
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
      const xrayCloudSettings = {
        clientId: '0000000000',
        clientSecret: '1111111111'
      }; 
      xrayClient = new XrayCloudClient(xrayCloudSettings);

      mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData );
    });
    
    afterEach(() => {
      mock.resetHistory();
    });
 
    
    it('sends the correct payload when submitResults is called', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/cucumber').reply(200, successfulResponseData);
  
      let reportConfig = {
        format: CUCUMBER_FORMAT
      }
      try {
        let response = await xrayClient.submitResults(reportFile, reportConfig);
  
        expect(mock.history.post.length).toBe(2);
        expect(mock.history.post[1].headers['Content-Type']).toEqual('application/json');
        let reportContent = fs.readFileSync(reportFile).toString('utf-8');
        expect(mock.history.post[1].data).toEqual(reportContent);
      } catch (error) {
          console.log(error);
          throw error;
      }
    });
  
    it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost(xrayCloudBaseUrl + '/import/execution/cucumber').reply(200, successfulResponseData);
  
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
            console.log(error);
            throw error;
        }
  
      });

});

describe('Cucumber standard endpoint', () => {
    let mock;
    let xrayClient;
    let reportFile = '__tests__/resources/xray_cloud.json';
    const successfulAuthResponseData = '"1234567890"';
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
      const xrayCloudSettings = {
        clientId: '0000000000',
        clientSecret: '1111111111'
      }; 
      xrayClient = new XrayCloudClient(xrayCloudSettings);

      mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData );
    });
    
    afterEach(() => {
      mock.resetHistory();
    });
 
    
    it('sends the correct payload when submitResults is called', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution').reply(200, successfulResponseData);
  
      let reportConfig = {
        format: XRAY_FORMAT
      }
      try {
        let response = await xrayClient.submitResults(reportFile, reportConfig);
  
        expect(mock.history.post.length).toBe(2);
        expect(mock.history.post[1].headers['Content-Type']).toEqual('application/json');
        let reportContent = fs.readFileSync(reportFile).toString('utf-8');
        expect(mock.history.post[1].data).toEqual(reportContent);
      } catch (error) {
          console.log(error);
          throw error;
      }
    });
  
    it('returns Test Execution data when submitResults is called with success', async() => {
        mock.onPost(xrayCloudBaseUrl + '/import/execution').reply(200, successfulResponseData);
  
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
            console.log(error);
            throw error;
        }
  
      });

});

/* multipart endpoints */

describe('JUnit multipart endpoint', () => {
    let mock;
    let xrayClient;
    let reportFile = '__tests__/resources/junit.xml';
    const successfulAuthResponseData = '"1234567890"';
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
        const xrayCloudSettings = {
            clientId: '0000000000',
            clientSecret: '1111111111'
        }; 
        xrayClient = new XrayCloudClient(xrayCloudSettings);

        mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData );  
    });
    
    afterEach(() => {
      mock.resetHistory();
    });
  
    it('returns an error when submitResultsMultipart is called, without Test Execution related info', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/junit/multipart').reply(200, successfulResponseData);
  
      let reportConfig = { format: JUNIT_FORMAT };
      try {
        let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
      } catch (error) {
        expect(error._response).toEqual('ERROR: testExecInfoFile or testExecInfo must be defined');
      }
    });
  
    it('sends the correct payload when submitResultsMultipart is called with Test Execution info', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/junit/multipart').reply(200, successfulResponseData);
  
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
  
        expect(mock.history.post.length).toBe(2);
        const rawFormData = mock.history.post[1].data.getBuffer().toString('utf-8');
        const boundary = mock.history.post[1].data.getBoundary();
        const parts = multipart.parse(Buffer.from(rawFormData), boundary);
        expect(parts.length).toBe(2);
  
        // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
        // and only assigns "filename" on the returned parsed part.
        // besides, it assumes "name" and "filename" appear in this exact order on the header
        expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
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
      mock.onPost(xrayCloudBaseUrl + '/import/execution/junit/multipart').reply(200, successfulResponseData);
  
      let reportConfig = {
        format: JUNIT_FORMAT,
        testExecInfoFile: '__tests__/resources/testExecInfo.json',
      }
      try {
        let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
  
        expect(mock.history.post.length).toBe(2);
        const rawFormData = mock.history.post[1].data.getBuffer().toString('utf-8');
        const boundary = mock.history.post[1].data.getBoundary();
        const parts = multipart.parse(Buffer.from(rawFormData), boundary);
        expect(parts.length).toBe(2);
  
        // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
        // and only assigns "filename" on the returned parsed part.
        // besides, it assumes "name" and "filename" appear in this exact order on the header
        expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
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
      mock.onPost(xrayCloudBaseUrl + '/import/execution/junit/multipart').reply(200, successfulResponseData);
  
      let reportConfig = {
        format: JUNIT_FORMAT,
        testInfoFile: '__tests__/resources/testInfo.json',
        testExecInfoFile: '__tests__/resources/testExecInfo.json'
      }
      try {
        let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
  
        expect(mock.history.post.length).toBe(2);
        const rawFormData = mock.history.post[1].data.getBuffer().toString('utf-8');
        const boundary = mock.history.post[1].data.getBoundary();
        const parts = multipart.parse(Buffer.from(rawFormData), boundary);
        expect(parts.length).toBe(3);
  
        // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
        // and only assigns "filename" on the returned parsed part.
        // besides, it assumes "name" and "filename" appear in this exact order on the header
        expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
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
        mock.onPost(xrayCloudBaseUrl + '/import/execution/junit/multipart').reply(200, successfulResponseData);

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
    const successfulAuthResponseData = '"1234567890"';
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
        const xrayCloudSettings = {
            clientId: '0000000000',
            clientSecret: '1111111111'
        }; 
        xrayClient = new XrayCloudClient(xrayCloudSettings);

        mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData );  
    });
    
    afterEach(() => {
      mock.resetHistory();
    });
  
    it('returns an error when submitResultsMultipart is called, without Test Execution related info', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/testng/multipart').reply(200, successfulResponseData);
  
      let reportConfig = { format: TESTNG_FORMAT };
      try {
        let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
      } catch (error) {
        expect(error._response).toEqual('ERROR: testExecInfoFile or testExecInfo must be defined');
      }
    });
  
    it('sends the correct payload when submitResultsMultipart is called with Test Execution info', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/testng/multipart').reply(200, successfulResponseData);
  
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
  
        expect(mock.history.post.length).toBe(2);
        const rawFormData = mock.history.post[1].data.getBuffer().toString('utf-8');
        const boundary = mock.history.post[1].data.getBoundary();
        const parts = multipart.parse(Buffer.from(rawFormData), boundary);
        expect(parts.length).toBe(2);
  
        // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
        // and only assigns "filename" on the returned parsed part.
        // besides, it assumes "name" and "filename" appear in this exact order on the header
        expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
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
      mock.onPost(xrayCloudBaseUrl + '/import/execution/testng/multipart').reply(200, successfulResponseData);
  
      let reportConfig = {
        format: TESTNG_FORMAT,
        testExecInfoFile: '__tests__/resources/testExecInfo.json',
      }
      try {
        let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
  
        expect(mock.history.post.length).toBe(2);
        const rawFormData = mock.history.post[1].data.getBuffer().toString('utf-8');
        const boundary = mock.history.post[1].data.getBoundary();
        const parts = multipart.parse(Buffer.from(rawFormData), boundary);
        expect(parts.length).toBe(2);
  
        // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
        // and only assigns "filename" on the returned parsed part.
        // besides, it assumes "name" and "filename" appear in this exact order on the header
        expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
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
      mock.onPost(xrayCloudBaseUrl + '/import/execution/testng/multipart').reply(200, successfulResponseData);
  
      let reportConfig = {
        format: TESTNG_FORMAT,
        testInfoFile: '__tests__/resources/testInfo.json',
        testExecInfoFile: '__tests__/resources/testExecInfo.json'
      }
      try {
        let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
  
        expect(mock.history.post.length).toBe(2);
        const rawFormData = mock.history.post[1].data.getBuffer().toString('utf-8');
        const boundary = mock.history.post[1].data.getBoundary();
        const parts = multipart.parse(Buffer.from(rawFormData), boundary);
        expect(parts.length).toBe(3);
  
        // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
        // and only assigns "filename" on the returned parsed part.
        // besides, it assumes "name" and "filename" appear in this exact order on the header
        expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
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
        mock.onPost(xrayCloudBaseUrl + '/import/execution/testng/multipart').reply(200, successfulResponseData);

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
    const successfulAuthResponseData = '"1234567890"';
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
        const xrayCloudSettings = {
            clientId: '0000000000',
            clientSecret: '1111111111'
        }; 
        xrayClient = new XrayCloudClient(xrayCloudSettings);

        mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData );  
    });
    
    afterEach(() => {
      mock.resetHistory();
    });
  
    it('returns an error when submitResultsMultipart is called, without Test Execution related info', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/nunit/multipart').reply(200, successfulResponseData);
  
      let reportConfig = { format: NUNIT_FORMAT };
      try {
        let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
      } catch (error) {
        expect(error._response).toEqual('ERROR: testExecInfoFile or testExecInfo must be defined');
      }
    });
  
    it('sends the correct payload when submitResultsMultipart is called with Test Execution info', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/nunit/multipart').reply(200, successfulResponseData);
  
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
  
        expect(mock.history.post.length).toBe(2);
        const rawFormData = mock.history.post[1].data.getBuffer().toString('utf-8');
        const boundary = mock.history.post[1].data.getBoundary();
        const parts = multipart.parse(Buffer.from(rawFormData), boundary);
        expect(parts.length).toBe(2);
  
        // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
        // and only assigns "filename" on the returned parsed part.
        // besides, it assumes "name" and "filename" appear in this exact order on the header
        expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
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
      mock.onPost(xrayCloudBaseUrl + '/import/execution/nunit/multipart').reply(200, successfulResponseData);
  
      let reportConfig = {
        format: NUNIT_FORMAT,
        testExecInfoFile: '__tests__/resources/testExecInfo.json',
      }
      try {
        let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
  
        expect(mock.history.post.length).toBe(2);
        const rawFormData = mock.history.post[1].data.getBuffer().toString('utf-8');
        const boundary = mock.history.post[1].data.getBoundary();
        const parts = multipart.parse(Buffer.from(rawFormData), boundary);
        expect(parts.length).toBe(2);
  
        // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
        // and only assigns "filename" on the returned parsed part.
        // besides, it assumes "name" and "filename" appear in this exact order on the header
        expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
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
      mock.onPost(xrayCloudBaseUrl + '/import/execution/nunit/multipart').reply(200, successfulResponseData);
  
      let reportConfig = {
        format: NUNIT_FORMAT,
        testInfoFile: '__tests__/resources/testInfo.json',
        testExecInfoFile: '__tests__/resources/testExecInfo.json'
      }
      try {
        let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
  
        expect(mock.history.post.length).toBe(2);
        const rawFormData = mock.history.post[1].data.getBuffer().toString('utf-8');
        const boundary = mock.history.post[1].data.getBoundary();
        const parts = multipart.parse(Buffer.from(rawFormData), boundary);
        expect(parts.length).toBe(3);
  
        // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
        // and only assigns "filename" on the returned parsed part.
        // besides, it assumes "name" and "filename" appear in this exact order on the header
        expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
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
        mock.onPost(xrayCloudBaseUrl + '/import/execution/nunit/multipart').reply(200, successfulResponseData);

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
    let reportFile = '__tests__/resources/xunit.xml';
    const successfulAuthResponseData = '"1234567890"';
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
        const xrayCloudSettings = {
            clientId: '0000000000',
            clientSecret: '1111111111'
        }; 
        xrayClient = new XrayCloudClient(xrayCloudSettings);

        mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData );  
    });
    
    afterEach(() => {
      mock.resetHistory();
    });
  
    it('returns an error when submitResultsMultipart is called, without Test Execution related info', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/xunit/multipart').reply(200, successfulResponseData);
  
      let reportConfig = { format: XUNIT_FORMAT };
      try {
        let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
      } catch (error) {
        expect(error._response).toEqual('ERROR: testExecInfoFile or testExecInfo must be defined');
      }
    });
  
    it('sends the correct payload when submitResultsMultipart is called with Test Execution info', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/xunit/multipart').reply(200, successfulResponseData);
  
      let reportConfig = {
        format: XUNIT_FORMAT,
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
  
        expect(mock.history.post.length).toBe(2);
        const rawFormData = mock.history.post[1].data.getBuffer().toString('utf-8');
        const boundary = mock.history.post[1].data.getBoundary();
        const parts = multipart.parse(Buffer.from(rawFormData), boundary);
        expect(parts.length).toBe(2);
  
        // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
        // and only assigns "filename" on the returned parsed part.
        // besides, it assumes "name" and "filename" appear in this exact order on the header
        expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
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
      mock.onPost(xrayCloudBaseUrl + '/import/execution/xunit/multipart').reply(200, successfulResponseData);
  
      let reportConfig = {
        format: XUNIT_FORMAT,
        testExecInfoFile: '__tests__/resources/testExecInfo.json',
      }
      try {
        let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
  
        expect(mock.history.post.length).toBe(2);
        const rawFormData = mock.history.post[1].data.getBuffer().toString('utf-8');
        const boundary = mock.history.post[1].data.getBoundary();
        const parts = multipart.parse(Buffer.from(rawFormData), boundary);
        expect(parts.length).toBe(2);
  
        // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
        // and only assigns "filename" on the returned parsed part.
        // besides, it assumes "name" and "filename" appear in this exact order on the header
        expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
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
      mock.onPost(xrayCloudBaseUrl + '/import/execution/xunit/multipart').reply(200, successfulResponseData);
  
      let reportConfig = {
        format: XUNIT_FORMAT,
        testInfoFile: '__tests__/resources/testInfo.json',
        testExecInfoFile: '__tests__/resources/testExecInfo.json'
      }
      try {
        let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
  
        expect(mock.history.post.length).toBe(2);
        const rawFormData = mock.history.post[1].data.getBuffer().toString('utf-8');
        const boundary = mock.history.post[1].data.getBoundary();
        const parts = multipart.parse(Buffer.from(rawFormData), boundary);
        expect(parts.length).toBe(3);
  
        // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
        // and only assigns "filename" on the returned parsed part.
        // besides, it assumes "name" and "filename" appear in this exact order on the header
        expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
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
        mock.onPost(xrayCloudBaseUrl + '/import/execution/xunit/multipart').reply(200, successfulResponseData);

        let reportConfig = {
        format: XUNIT_FORMAT,
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
    const successfulAuthResponseData = '"1234567890"';
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
        const xrayCloudSettings = {
            clientId: '0000000000',
            clientSecret: '1111111111'
        }; 
        xrayClient = new XrayCloudClient(xrayCloudSettings);

        mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData );  
    });
    
    afterEach(() => {
      mock.resetHistory();
    });
  
    it('returns an error when submitResultsMultipart is called, without Test Execution related info', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/robot/multipart').reply(200, successfulResponseData);
  
      let reportConfig = { format: ROBOT_FORMAT };
      try {
        let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
      } catch (error) {
        expect(error._response).toEqual('ERROR: testExecInfoFile or testExecInfo must be defined');
      }
    });
  
    it('sends the correct payload when submitResultsMultipart is called with Test Execution info', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/robot/multipart').reply(200, successfulResponseData);
  
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
  
        expect(mock.history.post.length).toBe(2);
        const rawFormData = mock.history.post[1].data.getBuffer().toString('utf-8');
        const boundary = mock.history.post[1].data.getBoundary();
        const parts = multipart.parse(Buffer.from(rawFormData), boundary);
        expect(parts.length).toBe(2);
  
        // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
        // and only assigns "filename" on the returned parsed part.
        // besides, it assumes "name" and "filename" appear in this exact order on the header
        expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
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
      mock.onPost(xrayCloudBaseUrl + '/import/execution/robot/multipart').reply(200, successfulResponseData);
  
      let reportConfig = {
        format: ROBOT_FORMAT,
        testExecInfoFile: '__tests__/resources/testExecInfo.json',
      }
      try {
        let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
  
        expect(mock.history.post.length).toBe(2);
        const rawFormData = mock.history.post[1].data.getBuffer().toString('utf-8');
        const boundary = mock.history.post[1].data.getBoundary();
        const parts = multipart.parse(Buffer.from(rawFormData), boundary);
        expect(parts.length).toBe(2);
  
        // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
        // and only assigns "filename" on the returned parsed part.
        // besides, it assumes "name" and "filename" appear in this exact order on the header
        expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
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
      mock.onPost(xrayCloudBaseUrl + '/import/execution/robot/multipart').reply(200, successfulResponseData);
  
      let reportConfig = {
        format: ROBOT_FORMAT,
        testInfoFile: '__tests__/resources/testInfo.json',
        testExecInfoFile: '__tests__/resources/testExecInfo.json'
      }
      try {
        let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
  
        expect(mock.history.post.length).toBe(2);
        const rawFormData = mock.history.post[1].data.getBuffer().toString('utf-8');
        const boundary = mock.history.post[1].data.getBoundary();
        const parts = multipart.parse(Buffer.from(rawFormData), boundary);
        expect(parts.length).toBe(3);
  
        // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
        // and only assigns "filename" on the returned parsed part.
        // besides, it assumes "name" and "filename" appear in this exact order on the header
        expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
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
        mock.onPost(xrayCloudBaseUrl + '/import/execution/robot/multipart').reply(200, successfulResponseData);

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
    const successfulAuthResponseData = '"1234567890"';
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
        const xrayCloudSettings = {
            clientId: '0000000000',
            clientSecret: '1111111111'
        }; 
        xrayClient = new XrayCloudClient(xrayCloudSettings);

        mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData );  
    });
    
    afterEach(() => {
      mock.resetHistory();
    });
  
    it('returns an error when submitResultsMultipart is called, without Test Execution related info', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/cucumber/multipart').reply(200, successfulResponseData);
  
      let reportConfig = { format: CUCUMBER_FORMAT };
      try {
        let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
      } catch (error) {
        expect(error._response).toEqual('ERROR: testExecInfoFile or testExecInfo must be defined');
      }
    });
  
    it('sends the correct payload when submitResultsMultipart is called with Test Execution info', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/cucumber/multipart').reply(200, successfulResponseData);
  
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
  
        expect(mock.history.post.length).toBe(2);
        const rawFormData = mock.history.post[1].data.getBuffer().toString('utf-8');
        const boundary = mock.history.post[1].data.getBoundary();
        const parts = multipart.parse(Buffer.from(rawFormData), boundary);
        expect(parts.length).toBe(2);
  
        // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
        // and only assigns "filename" on the returned parsed part.
        // besides, it assumes "name" and "filename" appear in this exact order on the header
        expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
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
      mock.onPost(xrayCloudBaseUrl + '/import/execution/cucumber/multipart').reply(200, successfulResponseData);
  
      let reportConfig = {
        format: CUCUMBER_FORMAT,
        testExecInfoFile: '__tests__/resources/testExecInfo.json',
      }
      try {
        let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
  
        expect(mock.history.post.length).toBe(2);
        const rawFormData = mock.history.post[1].data.getBuffer().toString('utf-8');
        const boundary = mock.history.post[1].data.getBoundary();
        const parts = multipart.parse(Buffer.from(rawFormData), boundary);
        expect(parts.length).toBe(2);
  
        // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
        // and only assigns "filename" on the returned parsed part.
        // besides, it assumes "name" and "filename" appear in this exact order on the header
        expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
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
        mock.onPost(xrayCloudBaseUrl + '/import/execution/cucumber/multipart').reply(200, successfulResponseData);

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

describe('Xray JSON multipart endpoint', () => {
    let mock;
    let xrayClient;
    let reportFile = '__tests__/resources/xray_cloud.json';
    const successfulAuthResponseData = '"1234567890"';
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
        const xrayCloudSettings = {
            clientId: '0000000000',
            clientSecret: '1111111111'
        }; 
        xrayClient = new XrayCloudClient(xrayCloudSettings);

        mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData );  
    });
    
    afterEach(() => {
      mock.resetHistory();
    });
  
    it('returns an error when submitResultsMultipart is called, without Test Execution related info', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/multipart').reply(200, successfulResponseData);
  
      let reportConfig = { format: XRAY_FORMAT };
      try {
        let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
      } catch (error) {
        expect(error._response).toEqual('ERROR: testExecInfoFile or testExecInfo must be defined');
      }
    });
  
    it('sends the correct payload when submitResultsMultipart is called with Test Execution info', async() => {
      mock.onPost(xrayCloudBaseUrl + '/import/execution/multipart').reply(200, successfulResponseData);
  
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
  
        expect(mock.history.post.length).toBe(2);
        const rawFormData = mock.history.post[1].data.getBuffer().toString('utf-8');
        const boundary = mock.history.post[1].data.getBoundary();
        const parts = multipart.parse(Buffer.from(rawFormData), boundary);
        expect(parts.length).toBe(2);
  
        // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
        // and only assigns "filename" on the returned parsed part.
        // besides, it assumes "name" and "filename" appear in this exact order on the header
        expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
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
      mock.onPost(xrayCloudBaseUrl + '/import/execution/multipart').reply(200, successfulResponseData);
  
      let reportConfig = {
        format: XRAY_FORMAT,
        testExecInfoFile: '__tests__/resources/testExecInfo.json',
      }
      try {
        let response = await xrayClient.submitResultsMultipart(reportFile, reportConfig);
  
        expect(mock.history.post.length).toBe(2);
        const rawFormData = mock.history.post[1].data.getBuffer().toString('utf-8');
        const boundary = mock.history.post[1].data.getBoundary();
        const parts = multipart.parse(Buffer.from(rawFormData), boundary);
        expect(parts.length).toBe(2);
  
        // parse-multipart-data has a bug which doesnt process "name" and "filename" attributes at the same time
        // and only assigns "filename" on the returned parsed part.
        // besides, it assumes "name" and "filename" appear in this exact order on the header
        expect(rawFormData).toEqual(expect.stringContaining(' name="results"'));
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
        mock.onPost(xrayCloudBaseUrl + '/import/execution/multipart').reply(200, successfulResponseData);

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

describe('graphQL: getTestPlanIssueId', () => {
    let mock;
    let xrayClient;
    const successfulAuthResponseData = '"dXNlcm5hbWU6cGFzc3dvcmQ="';
  
    beforeEach(() => {
      mock = new MockAdapter(axios);
    });
    
    afterEach(() => {
      mock.resetHistory();
    });

    it('returns the issueId, for a valid request and successful authentication', async() => {
        mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData );

        // {  "query":     "{ getTestPlans(jql: \"key = CALC-12\", limit: 1) { total results { issueId } } }" }
        // 
        let mockedResponse = {
            "data": {
                "getTestPlans": {
                    "total": 1,
                    "results": [
                        {
                            "issueId": "109601"
                        }
                    ]
                }
            }
        }
        const mockedGraphQLserver = nock('https://xray.cloud.getxray.app').post('/api/v2/graphql').matchHeader('authorization', 'Bearer dXNlcm5hbWU6cGFzc3dvcmQ=').reply(200, mockedResponse );

        const xrayCloudSettings = {
            clientId: '0000000000',
            clientSecret: '1111111111'
        }; 
        xrayClient = new XrayCloudClient(xrayCloudSettings);

        try {
            let testPlanIssueId = await xrayClient.getTestPlanId('CALC-17');
            expect(testPlanIssueId).toEqual("109601");
            expect(mock.history.post[0].data).toEqual("{\"client_id\":\"0000000000\",\"client_secret\":\"1111111111\"}");
        } catch (error) {
            throw error;
        }
    });

});

describe('graphQL: associateTestExecutionToTestPlanByIds', () => {
    let mock;
    let xrayClient;
    const successfulAuthResponseData = '"dXNlcm5hbWU6cGFzc3dvcmQ="';
  
    beforeEach(() => {
      mock = new MockAdapter(axios);
    });
    
    afterEach(() => {
      mock.resetHistory();
    });

    it('associates a Test Execution to a Test Plan, for a valid request and successful authentication', async() => {
        mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData );
        let mockedResponse = {
            "data": {
                "data": {
                    "addTestExecutionsToTestPlan": {
                        "addedTestExecutions": [ "10001" ],
                        "warning": null
                    }
                }
            }
        }
        const mockedGraphQLserver = nock('https://xray.cloud.getxray.app').post('/api/v2/graphql').matchHeader('authorization', 'Bearer dXNlcm5hbWU6cGFzc3dvcmQ=').reply(200, mockedResponse );

        const xrayCloudSettings = {
            clientId: '0000000000',
            clientSecret: '1111111111'
        }; 
        xrayClient = new XrayCloudClient(xrayCloudSettings);

        try {
            let testExecIssueId = "10001";
            let testPlanIssueId = "10000";
            let res = await xrayClient.associateTestExecutionToTestPlanByIds(testExecIssueId, testPlanIssueId);
            expect(mock.history.post[0].data).toEqual("{\"client_id\":\"0000000000\",\"client_secret\":\"1111111111\"}");
           // expect(res._response.data.addTestExecutionsToTestPlan.addedTestExecutions[0]).toEqual(testExecIssueId);
           expect(res).toEqual(testExecIssueId);
        } catch (error) {
            throw error;
        }
    });

    it('does not associate a Test Execution to a Test Plan if already associated, for a valid request and successful authentication', async() => {
        mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData );
        let mockedResponse = {
            "data": {
                "data": {
                    "addTestExecutionsToTestPlan": {
                        "addedTestExecutions": [],
                        "warning": null
                    }
                }
            }
        }
        const mockedGraphQLserver = nock('https://xray.cloud.getxray.app').post('/api/v2/graphql').matchHeader('authorization', 'Bearer dXNlcm5hbWU6cGFzc3dvcmQ=').reply(200, mockedResponse );

        const xrayCloudSettings = {
            clientId: '0000000000',
            clientSecret: '1111111111'
        }; 
        xrayClient = new XrayCloudClient(xrayCloudSettings);

        try {
            let testExecIssueId = "10001";
            let testPlanIssueId = "10000";
            let res = await xrayClient.associateTestExecutionToTestPlanByIds(testExecIssueId, testPlanIssueId);
            expect(mock.history.post[0].data).toEqual("{\"client_id\":\"0000000000\",\"client_secret\":\"1111111111\"}");
           // expect(res._response.data.addTestExecutionsToTestPlan.addedTestExecutions[0]).toEqual(testExecIssueId);
           expect(res).toEqual(testExecIssueId);
        } catch (error) {
            throw error;
        }
    });

    it('returns error if failed to associate a Test Execution to a Test Plan even with a successful authentication', async() => {
        mock.onPost(authenticateUrl).reply(200, successfulAuthResponseData );
        let mockedResponse = {
            "errors": [
                {
                    "message": "User doesn't have permissions to edit issue with id 10000",
                    "locations": [
                        {
                            "line": 1,
                            "column": 12
                        }
                    ],
                    "path": [
                        "addTestExecutionsToTestPlan"
                    ]
                }
            ],
            "data": {
                "addTestExecutionsToTestPlan": null
            }
        }
        const mockedGraphQLserver = nock('https://xray.cloud.getxray.app').post('/api/v2/graphql').matchHeader('authorization', 'Bearer dXNlcm5hbWU6cGFzc3dvcmQ=').reply(200, mockedResponse );

        const xrayCloudSettings = {
            clientId: '0000000000',
            clientSecret: '1111111111'
        }; 
        xrayClient = new XrayCloudClient(xrayCloudSettings);

        try {
            let testExecIssueId = "10001";
            let testPlanIssueId = "10000";
            let res = await xrayClient.associateTestExecutionToTestPlanByIds(testExecIssueId, testPlanIssueId);
            throw new Error(); // should not come here
        } catch (error) {
            expect(mock.history.post[0].data).toEqual("{\"client_id\":\"0000000000\",\"client_secret\":\"1111111111\"}");
            // expect(res._response.data.addTestExecutionsToTestPlan.addedTestExecutions[0]).toEqual(testExecIssueId);
            //expect(res._response.errors[0].message).toEqual("User doesn't have permissions to edit issue with id 10000");
            expect(error.errorMessages.length).toBe(1);
            expect(error.errorMessages[0]).toEqual("User doesn't have permissions to edit issue with id 10000");
        }
    });

});