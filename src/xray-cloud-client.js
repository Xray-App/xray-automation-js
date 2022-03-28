import { GraphQLClient, gql } from 'graphql-request'
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import XrayErrorResponse from './xray-error-response.js';
import XrayCloudResponseV2 from './xray-cloud-response-v2.js';
// import XrayCloudGraphQLResponseV2 from './xray-cloud-graphql-response-v2.js';
import XrayCloudGraphQLErrorResponse from './xray-cloud-graphql-error-response.js';
import { XRAY_FORMAT, JUNIT_FORMAT, TESTNG_FORMAT, ROBOT_FORMAT, NUNIT_FORMAT, XUNIT_FORMAT, CUCUMBER_FORMAT } from './index.js';

/*
// import { request, GraphQLClient } from 'graphql-request'
/// var request = require('graphql-request').request;
var GraphQLClient = require('graphql-request').GraphQLClient;
var gql = require('graphql-request').gql;
var axios = require('axios');
var fs = require('fs');
var FormData = require('form-data');
const  XrayErrorResponse = require('./xray-error-response.js')
const  XrayCloudResponseV2 = require('./xray-cloud-response-v2.js')
*/

const xrayCloudBaseUrl = "https://xray.cloud.getxray.app/api/v2";        
const authenticateUrl = xrayCloudBaseUrl + "/authenticate";


class XrayCloudClient {

    supportedFormats = [ XRAY_FORMAT, JUNIT_FORMAT, TESTNG_FORMAT, ROBOT_FORMAT, NUNIT_FORMAT, XUNIT_FORMAT, CUCUMBER_FORMAT ];

    constructor(xraySettings) {
        this.clientId = xraySettings.clientId;
        this.clientSecret = xraySettings.clientSecret;
    }

    async submitResults(reportPath, config) {     
        if (config.format === undefined)
            throw new XrayErrorResponse("ERROR: format must be specified");

        if (!this.supportedFormats.includes(config.format))
            throw new XrayErrorResponse("ERROR: unsupported format " + config.format);

        let reportContent;
        try {
            reportContent = fs.readFileSync(reportPath).toString();
        } catch(error) {
            throw new XrayErrorResponse(error.message);
        }

        return axios.post(authenticateUrl, { "client_id": this.clientId, "client_secret": this.clientSecret }, {}).then( (response) => {
            var authToken = response.data;          
            return authToken;
        }).then( authToken => {
            let endpointUrl;
            if (config.format === XRAY_FORMAT) {
                endpointUrl = xrayCloudBaseUrl + "/import/execution";
            } else {
                endpointUrl = xrayCloudBaseUrl + "/import/execution/" + config.format;
            }

            let params = {};
            let url = endpointUrl;

            // all formats support GET parameters, except for xray and cucumber
            if (![ XRAY_FORMAT, CUCUMBER_FORMAT ].includes(config.format)) {

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
                url = endpointUrl + "?" + urlParams;               
            }

            let contentType;
            if ([ JUNIT_FORMAT, TESTNG_FORMAT, NUNIT_FORMAT, XUNIT_FORMAT, ROBOT_FORMAT ].includes(config.format)) {
                contentType = 'application/xml';
            } else {
                contentType = 'application/json';
            }

            return axios.post(url, reportContent, {
                headers: { 'Authorization': "Bearer " + authToken, "Content-Type": contentType }
            });
        }).then(function(response) {
            return new XrayCloudResponseV2(response);       
        }).catch(function(error) {
            if (error.response !== undefined)
                throw new XrayErrorResponse(error.response);
            else
                throw new XrayErrorResponse(error._response);
        });

    }

    async submitResultsMultipart(reportPath, config) {		
        if (config.format === undefined)
            throw new XrayErrorResponse("ERROR: format must be specified");

        if (!this.supportedFormats.includes(config.format))
            throw new XrayErrorResponse("ERROR: unsupported format " + config.format);

        if ((config.testExecInfoFile === undefined) && (config.testExecInfo === undefined))
            throw new XrayErrorResponse("ERROR: testExecInfoFile or testExecInfo must be defined");

        return axios.post(authenticateUrl, { "client_id": this.clientId, "client_secret": this.clientSecret }, {}).then( (response) => {
            var authToken = response.data;          
            return authToken;
        }).then( authToken => {
            let endpointUrl;
            if (config.format === XRAY_FORMAT) {
                endpointUrl = xrayCloudBaseUrl + "/import/execution/multipart";
            } else {
                endpointUrl = xrayCloudBaseUrl + "/import/execution/" + config.format + "/multipart";
            }

            /*
            let contentType;
            if ([ JUNIT_FORMAT, TESTNG_FORMAT, NUNIT_FORMAT, XUNIT_FORMAT, ROBOT_FORMAT ].includes(config.format)) {
                contentType = 'application/xml';
            } else {
                contentType = 'application/json';
            }
            */

            let reportContent;
            let testInfoContent;
            let testExecInfoContent;
            try {
                reportContent = fs.readFileSync(reportPath).toString();
                if (config.testInfoFile !== undefined)
                    testInfoContent = fs.readFileSync(config.testInfoFile).toString();
                if (config.testInfo !== undefined)
                    testInfoContent = config.testInfo.toString();
                if (config.testExecInfoFile !== undefined)
                    testExecInfoContent = fs.readFileSync(config.testExecInfoFile).toString();
                else
                    testExecInfoContent = config.testExecInfo.toString();
            } catch(error) {
                throw new XrayErrorResponse(error.message);
            }

            var bodyFormData = new FormData();
            let fileName;
            if ([ JUNIT_FORMAT, TESTNG_FORMAT, NUNIT_FORMAT, XUNIT_FORMAT, ROBOT_FORMAT ].includes(config.format)) {
                fileName = 'report.xml';
            } else {
                fileName = 'report.json';
            }
            bodyFormData.append('results', reportContent, fileName);
            bodyFormData.append('info', testExecInfoContent, 'info.json');
            if ((testInfoContent !== undefined) && ([ JUNIT_FORMAT, TESTNG_FORMAT, NUNIT_FORMAT, XUNIT_FORMAT, ROBOT_FORMAT ].includes(config.format)))
                bodyFormData.append('testInfo', testInfoContent, 'testInfo.json');

            return axios.post(endpointUrl, bodyFormData, {
                headers: { 'Authorization': "Bearer " + authToken, ...bodyFormData.getHeaders() }
            });
        }).then(function(response) {
            return new XrayCloudResponseV2(response);       
        }).catch(function(error) {
            if (error.response !== undefined)
                throw new XrayErrorResponse(error.response);
            else
                throw new XrayErrorResponse(error._response);
        });

    }

    async authenticate() {        
        return axios.post(authenticateUrl, { "client_id": this.clientId, "client_secret": this.clientSecret }, {}).then( (response) => {
            var authToken = response.data;          
            return authToken;
        });
    }

    async associateTestExecutionToTestPlanByIds(testExecIssueId, testPlanIssueId) {        
        return axios.post(authenticateUrl, { "client_id": this.clientId, "client_secret": this.clientSecret }, {}).then( (response) => {
            var authToken = response.data;          
            return authToken;
        }).then( authToken => {
            const graphQLEndpoint = xrayCloudBaseUrl + "/graphql";
            const graphQLClient = new GraphQLClient(graphQLEndpoint, {
                headers: {
                  authorization: 'Bearer ' + authToken,
                },
              })

              const mutation = gql`
              mutation {
                addTestExecutionsToTestPlan(
                    issueId: "${testPlanIssueId}",
                    testExecIssueIds: ["${testExecIssueId}"]
                ) {
                    addedTestExecutions
                    warning
                }
            }
            `

            return graphQLClient.request(mutation);
        }).then(function(response) {
            return response.data.addTestExecutionsToTestPlan.addedTestExecutions[0] || testExecIssueId;
            //return new XrayCloudGraphQLResponseV2(response, response.data.addTestExecutionsToTestPlan.addedTestExecutions[0] || testExecIssueId);  
        }).catch(function(error) {
            let errorMessages = error.response.errors.map(function(err) {
                return err.message;
            });
            throw new XrayCloudGraphQLErrorResponse(error, errorMessages);
        });
    }

    async getTestPlanId(testPlanIssueKey) {
        return this.authenticate().then(authToken => {
            const graphQLEndpoint = xrayCloudBaseUrl + "/graphql";
            const graphQLClient = new GraphQLClient(graphQLEndpoint, {
                headers: {
                  authorization: 'Bearer ' + authToken,
                },
              })

              const query = gql`
                {
                    getTestPlans(jql: "key = ${testPlanIssueKey}", limit: 1) {
                        total
                        results {
                            issueId
                        }
                    }
                }
            `

            return graphQLClient.request(query);
        }).then(function(response) {
            return response.getTestPlans.results[0].issueId;
        }).catch(function(error) {
            let errorMessages = error.response.errors.map(function(err) {
                return err.message;
            });
            throw new XrayCloudGraphQLErrorResponse(error, errorMessages);
        });
    }

}

//module.exports = XrayCloudClient;
export default XrayCloudClient;