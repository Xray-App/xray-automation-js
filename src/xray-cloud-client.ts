import { GraphQLClient, gql } from "graphql-request";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import XrayErrorResponse from "./xray-error-response";
import XrayCloudResponseV2 from "./xray-cloud-response-v2";
// import XrayCloudGraphQLResponseV2 from './xray-cloud-graphql-response-v2';
import XrayCloudGraphQLErrorResponse from "./xray-cloud-graphql-error-response";
import {
  XRAY_FORMAT,
  JUNIT_FORMAT,
  TESTNG_FORMAT,
  ROBOT_FORMAT,
  NUNIT_FORMAT,
  XUNIT_FORMAT,
  CUCUMBER_FORMAT,
  BEHAVE_FORMAT,
  ReportConfig,
  XraySettings,
} from "./index";

const xrayCloudBaseUrl = "https://xray.cloud.getxray.app/api/v2";
const authenticateUrl = xrayCloudBaseUrl + "/authenticate";

export class XrayCloudClient {
  clientId?: string;
  clientSecret?: string;
  timeout?: number;

  supportedFormats = [
    XRAY_FORMAT,
    JUNIT_FORMAT,
    TESTNG_FORMAT,
    ROBOT_FORMAT,
    NUNIT_FORMAT,
    XUNIT_FORMAT,
    CUCUMBER_FORMAT,
    BEHAVE_FORMAT,
  ];

  constructor(xraySettings: XraySettings) {
    this.clientId = xraySettings.clientId;
    this.clientSecret = xraySettings.clientSecret;
    if (xraySettings.timeout !== undefined) this.timeout = xraySettings.timeout;
    else this.timeout = 50000;
    axios.defaults.timeout = this.timeout;
  }

  async submitResults(reportPath: string, config: ReportConfig) {
    if (config.format === undefined)
      throw new XrayErrorResponse("ERROR: format must be specified");

    if (!this.supportedFormats.includes(config.format))
      throw new XrayErrorResponse("ERROR: unsupported format " + config.format);

    let reportContent: string;
    try {
      reportContent = fs.readFileSync(reportPath).toString();
    } catch (error: any) {
      throw new XrayErrorResponse(error.message);
    }

    // use a CancelToken as the timeout setting is not reliable
    const cancelTokenSource = axios.CancelToken.source();
    const timeoutFn = setTimeout(() => {
      cancelTokenSource.cancel("request timeout");
    }, this.timeout);

    return axios
      .post(
        authenticateUrl,
        { client_id: this.clientId, client_secret: this.clientSecret },
        {
          timeout: this.timeout,
          cancelToken: cancelTokenSource.token,
        }
      )
      .then((response) => {
        const authToken = response.data;
        return authToken;
      })
      .then((authToken) => {
        let endpointUrl;
        if (config.format === XRAY_FORMAT) {
          endpointUrl = xrayCloudBaseUrl + "/import/execution";
        } else {
          endpointUrl = xrayCloudBaseUrl + "/import/execution/" + config.format;
        }

        interface IParams {
          projectKey?: string;
          testPlanKey?: string;
          testExecKey?: string;
          fixVersion?: string;
          revision?: string;
          testEnvironments?: string;
        }
        const params: IParams = {};
        let url = endpointUrl;

        // all formats support GET parameters, except for xray and cucumber
        if (
          ![XRAY_FORMAT, CUCUMBER_FORMAT, BEHAVE_FORMAT].includes(config.format)
        ) {
          if (
            config.projectKey === undefined &&
            config.testExecKey === undefined
          ) {
            throw new XrayErrorResponse(
              "ERROR: projectKey or testExecKey must be defined"
            );
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
            params.testEnvironments = config.testEnvironments.join(";");
          }
          const urlParams = new URLSearchParams({ ...params }).toString();
          url = endpointUrl + "?" + urlParams;
        }

        let contentType;
        if (
          [
            JUNIT_FORMAT,
            TESTNG_FORMAT,
            NUNIT_FORMAT,
            XUNIT_FORMAT,
            ROBOT_FORMAT,
          ].includes(config.format)
        ) {
          contentType = "application/xml";
        } else {
          contentType = "application/json";
        }

        return axios.post(url, reportContent, {
          timeout: this.timeout,
          cancelToken: cancelTokenSource.token,
          headers: {
            Authorization: "Bearer " + authToken,
            "Content-Type": contentType,
          },
        });
      })
      .then((response) => {
        clearTimeout(timeoutFn);
        return new XrayCloudResponseV2(response);
      })
      .catch((error) => {
        if (error.response !== undefined)
          throw new XrayErrorResponse(error.response);
        else throw new XrayErrorResponse(error.message || error._response);
      });
  }

  async submitResultsMultipart(reportPath: string, config: ReportConfig) {
    if (config.format === undefined)
      throw new XrayErrorResponse("ERROR: format must be specified");

    if (!this.supportedFormats.includes(config.format))
      throw new XrayErrorResponse("ERROR: unsupported format " + config.format);

    if (
      config.testExecInfoFile === undefined &&
      config.testExecInfo === undefined
    )
      throw new XrayErrorResponse(
        "ERROR: testExecInfoFile or testExecInfo must be defined"
      );

    // use a CancelToken as the timeout setting is not reliable
    const cancelTokenSource = axios.CancelToken.source();
    const timeoutFn = setTimeout(() => {
      cancelTokenSource.cancel("request timeout");
    }, this.timeout);

    return axios
      .post(
        authenticateUrl,
        { client_id: this.clientId, client_secret: this.clientSecret },
        {
          timeout: this.timeout,
          cancelToken: cancelTokenSource.token,
        }
      )
      .then((response) => {
        // clearTimeout(timeoutFn);
        const authToken = response.data;
        return authToken;
      })
      .then((authToken) => {
        let endpointUrl;
        if (config.format === XRAY_FORMAT) {
          endpointUrl = xrayCloudBaseUrl + "/import/execution/multipart";
        } else {
          endpointUrl =
            xrayCloudBaseUrl +
            "/import/execution/" +
            config.format +
            "/multipart";
        }

        let reportContent;
        let testInfoContent;
        let testExecInfoContent;
        try {
          reportContent = fs.readFileSync(reportPath).toString();
          if (config.testInfoFile !== undefined)
            testInfoContent = fs.readFileSync(config.testInfoFile).toString();
          if (config.testInfo !== undefined)
            testInfoContent = JSON.stringify(config.testInfo);
          if (config.testExecInfoFile !== undefined)
            testExecInfoContent = fs
              .readFileSync(config.testExecInfoFile)
              .toString();
          else testExecInfoContent = JSON.stringify(config.testExecInfo);
        } catch (error: any) {
          throw new XrayErrorResponse(error.message);
        }

        const bodyFormData = new FormData();
        let fileName;
        if (
          [
            JUNIT_FORMAT,
            TESTNG_FORMAT,
            NUNIT_FORMAT,
            XUNIT_FORMAT,
            ROBOT_FORMAT,
          ].includes(config.format)
        ) {
          fileName = "report.xml";
        } else {
          fileName = "report.json";
        }
        bodyFormData.append("results", reportContent, fileName);
        bodyFormData.append("info", testExecInfoContent, "info.json");
        if (
          testInfoContent !== undefined &&
          [
            JUNIT_FORMAT,
            TESTNG_FORMAT,
            NUNIT_FORMAT,
            XUNIT_FORMAT,
            ROBOT_FORMAT,
          ].includes(config.format)
        )
          bodyFormData.append("testInfo", testInfoContent, "testInfo.json");

        return axios.post(endpointUrl, bodyFormData, {
          timeout: this.timeout,
          cancelToken: cancelTokenSource.token,
          headers: {
            Authorization: "Bearer " + authToken,
            ...bodyFormData.getHeaders(),
          },
        });
      })
      .then((response) => {
        clearTimeout(timeoutFn);
        return new XrayCloudResponseV2(response);
      })
      .catch((error) => {
        if (error.response !== undefined)
          throw new XrayErrorResponse(error.response);
        else throw new XrayErrorResponse(error.message || error._response);
      });
  }

  async authenticate() {
    // use a CancelToken as the timeout setting is not reliable
    const cancelTokenSource = axios.CancelToken.source();
    const timeoutFn = setTimeout(() => {
      cancelTokenSource.cancel("request timeout");
    }, this.timeout);

    return axios
      .post(
        authenticateUrl,
        { client_id: this.clientId, client_secret: this.clientSecret },
        {
          timeout: this.timeout,
          cancelToken: cancelTokenSource.token,
        }
      )
      .then((response) => {
        clearTimeout(timeoutFn);
        const authToken = response.data;
        return authToken;
      });
  }

  async associateTestExecutionToTestPlanByIds(
    testExecIssueId: string,
    testPlanIssueId: string
  ) {
    // use a CancelToken as the timeout setting is not reliable
    const cancelTokenSource = axios.CancelToken.source();
    const timeoutFn = setTimeout(() => {
      cancelTokenSource.cancel("request timeout");
    }, this.timeout);

    return axios
      .post(
        authenticateUrl,
        { client_id: this.clientId, client_secret: this.clientSecret },
        {
          timeout: this.timeout,
          cancelToken: cancelTokenSource.token,
        }
      )
      .then((response) => {
        clearTimeout(timeoutFn);
        const authToken = response.data;
        return authToken;
      })
      .then((authToken) => {
        const graphQLEndpoint = xrayCloudBaseUrl + "/graphql";
        const graphQLClient = new GraphQLClient(graphQLEndpoint, {
          headers: {
            authorization: "Bearer " + authToken,
          },
        });

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
            `;

        return graphQLClient.request(mutation);
      })
      .then((response) => {
        const res = response as { data: { addTestExecutionsToTestPlan: { addedTestExecutions: string[] } } };
        return (
          res.data.addTestExecutionsToTestPlan.addedTestExecutions[0] ||
          testExecIssueId
        );
        // return new XrayCloudGraphQLResponseV2(response, response.data.addTestExecutionsToTestPlan.addedTestExecutions[0] || testExecIssueId);
      })
      .catch((error) => {
        const errorMessages = error.response.errors.map((err: any) => {
          return err.message;
        });
        throw new XrayCloudGraphQLErrorResponse(error, errorMessages);
      });
  }

  async getTestPlanId(testPlanIssueKey: string) {
    return this.authenticate()
      .then((authToken) => {
        const graphQLEndpoint = xrayCloudBaseUrl + "/graphql";
        const graphQLClient = new GraphQLClient(graphQLEndpoint, {
          headers: {
            authorization: "Bearer " + authToken,
          },
        });

        const query = gql`
                {
                    getTestPlans(jql: "key = ${testPlanIssueKey}", limit: 1) {
                        total
                        results {
                            issueId
                        }
                    }
                }
            `;

        return graphQLClient.request(query);
      })
      .then((response) => {
        const res = response as { getTestPlans: { results: { issueId: string }[] } };
        return res.getTestPlans.results[0].issueId;
      })
      .catch((error) => {
        const errorMessages = error.response.errors.map((err: any) => {
          return err.message;
        });
        throw new XrayCloudGraphQLErrorResponse(error, errorMessages);
      });
  }
}

export default XrayCloudClient;
