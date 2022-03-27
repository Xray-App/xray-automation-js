import btoa from 'btoa';
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

import XrayErrorResponse from './xray-error-response.js';
import XrayDatacenterResponseV1 from './xray-datacenter-response-v1.js';
import XrayDatacenterResponseV2 from './xray-datacenter-response-v2.js';
import { XRAY_FORMAT, JUNIT_FORMAT, TESTNG_FORMAT, ROBOT_FORMAT, NUNIT_FORMAT, XUNIT_FORMAT, CUCUMBER_FORMAT, BEHAVE_FORMAT } from './index.js';

class XrayDatacenterClient {

    supportedFormats = [ XRAY_FORMAT, JUNIT_FORMAT, TESTNG_FORMAT, ROBOT_FORMAT, NUNIT_FORMAT, XUNIT_FORMAT, CUCUMBER_FORMAT, BEHAVE_FORMAT ];

    constructor(xraySettings) {
        this.jiraBaseUrl = xraySettings.jiraBaseUrl;
        this.jiraUsername = xraySettings.jiraUsername;
        this.jiraPassword = xraySettings.jiraPassword;
        this.jiraToken = xraySettings.jiraToken;
    }

    async submitResults(reportPath, config) {		
        if (config.format === undefined)
            throw new XrayErrorResponse("ERROR: format must be specified");

        if (!this.supportedFormats.includes(config.format))
            throw new XrayErrorResponse("ERROR: unsupported format " + config.format);

		let endpointUrl;
        if (config.format === XRAY_FORMAT) {
            endpointUrl = this.jiraBaseUrl + "/rest/raven/2.0/import/execution";
        } else {
            endpointUrl = this.jiraBaseUrl + "/rest/raven/2.0/import/execution/" + config.format;
        }
		
        var authorizationHeaderValue;
        if (this.jiraToken !== undefined) {
            authorizationHeaderValue = 'Bearer ' + this.jiraToken;
        } else {
            authorizationHeaderValue = 'Basic ' + btoa(this.jiraUsername + ':' + this.jiraPassword);
        }

        let reportContent;
        try {
            reportContent = fs.readFileSync(reportPath).toString();
        } catch(error) {
            throw new XrayErrorResponse(error.message);
        }
        // for xray, cucumber and behave reports send the report directly on the body
        if ([ XRAY_FORMAT, CUCUMBER_FORMAT, BEHAVE_FORMAT ].includes(config.format)) {
            return axios.post(endpointUrl, reportContent, {
                headers: { 'Authorization': authorizationHeaderValue, 'Content-Type': 'application/json' }
            }).then(function(response) {
                return new XrayDatacenterResponseV2(response);
            }).catch(function(error) {
                throw new XrayErrorResponse(error.response);
            });   
        } else {
            let params = {};
            if ((config.projectKey === undefined) && (config.testExecKey === undefined)) {
                throw new XrayErrorResponse('ERROR: projectKey or testExecKey must be defined');
            }
            if (config.projectKey !== undefined) {
                params.projectKey = config.projectKey;
            }
            if (config.testPlanKey !== undefined) {
                params.testPlanKey = config.testPlanKey;
            }
            if (config.testExecKey !== undefined) {
                params.testExecKey = config.testExecKey;
            }
            if (config.version !== undefined) {
                params.fixVersion = config.version;
            }
            if (config.revision !== undefined) {
                params.revision = config.revision;
            }
            if (config.testEnvironment !== undefined) {
                params.testEnvironments = config.testEnvironment;
            }
            if (config.testEnvironments !== undefined) {
                params.testEnvironments = config.testEnvironments.join(';');
            }

            const urlParams = new URLSearchParams(params).toString();
            const url = endpointUrl + "?" + urlParams;
            var bodyFormData = new FormData();
            let fileName;
            if ([ JUNIT_FORMAT, TESTNG_FORMAT, NUNIT_FORMAT, XUNIT_FORMAT, ROBOT_FORMAT ].includes(config.format)) {
                fileName = 'report.xml';
            } else {
                fileName = 'report.json'
            }
            bodyFormData.append('file', reportContent, fileName); 
            return axios.post(url, bodyFormData, {
                headers: { 'Authorization': authorizationHeaderValue, ...bodyFormData.getHeaders() }
            }).then(function(response) {
                return new XrayDatacenterResponseV2(response);
            }).catch(function(error) {
                throw new XrayErrorResponse(error.response);
            });   
        }

    }

    async submitResultsMultipart(reportPath, config) {		
        if (config.format === undefined)
            throw new XrayErrorResponse("ERROR: format must be specified");

        if (!this.supportedFormats.includes(config.format))
            throw new XrayErrorResponse("ERROR: unsupported format " + config.format);

        if ((config.testExecInfoFile === undefined) && (config.testExecInfo === undefined))
            throw new XrayErrorResponse("ERROR: testExecInfoFile or testExecInfo must be defined");

		let endpointUrl;
        if (config.format === XRAY_FORMAT) {
            endpointUrl = this.jiraBaseUrl + "/rest/raven/2.0/import/execution/multipart";
        } else {
            endpointUrl = this.jiraBaseUrl + "/rest/raven/2.0/import/execution/" + config.format + "/multipart";
        }
		
        var authorizationHeaderValue;
        if (this.jiraToken !== undefined) {
            authorizationHeaderValue = 'Bearer ' + this.jiraToken;
        } else {
            authorizationHeaderValue = 'Basic ' + btoa(this.jiraUsername + ':' + this.jiraPassword);
        }

        let reportContent;
        let testInfoContent;
        let testExecInfoContent;
        try {
            reportContent = fs.readFileSync(reportPath).toString();
            if (config.testInfoFile !== undefined)
                testInfoContent = fs.readFileSync(config.testInfoFile).toString();
            if (config.testInfo !== undefined)
                tesInfoContent = config.testInfo.toString();
            if (config.testExecInfoFile !== undefined)
                testExecInfoContent = fs.readFileSync(config.testExecInfoFile).toString();
            else
                testExecInfoContent = config.testExecInfo.toString();
        } catch(error) {
            throw new XrayErrorResponse(error.message);
        }

        var bodyFormData = new FormData();
        let filePartName;
        let fileName;
        if ([ JUNIT_FORMAT, TESTNG_FORMAT, NUNIT_FORMAT, XUNIT_FORMAT, ROBOT_FORMAT ].includes(config.format)) {
            filePartName = 'file';
            fileName = 'report.xml';
        } else {
            filePartName = 'result';
            fileName = 'report.json';
        }
        bodyFormData.append(filePartName, reportContent, fileName);
        bodyFormData.append('info', testExecInfoContent, 'info.json');
        if ((testInfoContent !== undefined) && ([ JUNIT_FORMAT, TESTNG_FORMAT, NUNIT_FORMAT, XUNIT_FORMAT, ROBOT_FORMAT ].includes(config.format)))
            bodyFormData.append('testInfo', testInfoContent, 'testInfo.json');

        return axios.post(endpointUrl, bodyFormData, {
            headers: { 'Authorization': authorizationHeaderValue, ...bodyFormData.getHeaders() }
        }).then(function(response) {
            return new XrayDatacenterResponseV2(response);
        }).catch(function(error) {
            throw new XrayErrorResponse(error.response);
        });

    }

}

//module.exports = XrayDatacenterClient;
export default XrayDatacenterClient;