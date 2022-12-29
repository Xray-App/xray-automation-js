import axios from "axios";
import fs from "fs";
import FormData from "form-data";

import type { XraySettings } from "../types/xray-settings";
import type { ReportConfig } from "../types/report-config";
import XrayErrorResponse from "./xray-error-response";
// import XrayDatacenterResponseV1 from './xray-datacenter-response-v1';
import XrayDatacenterResponseV2 from "./xray-datacenter-response-v2";

import {
  XRAY_FORMAT,
  JUNIT_FORMAT,
  TESTNG_FORMAT,
  ROBOT_FORMAT,
  NUNIT_FORMAT,
  XUNIT_FORMAT,
  CUCUMBER_FORMAT,
  BEHAVE_FORMAT,
} from "./index";

export class XrayDatacenterClient {
  jiraBaseUrl?: string;
  jiraUsername?: string;
  jiraPassword?: string;
  jiraToken?: string;
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

  constructor(public xraySettings: XraySettings) {
    this.jiraBaseUrl = xraySettings.jiraBaseUrl;
    this.jiraUsername = xraySettings.jiraUsername;
    this.jiraPassword = xraySettings.jiraPassword;
    this.jiraToken = xraySettings.jiraToken;
    if (xraySettings.timeout !== undefined) this.timeout = xraySettings.timeout;
    else this.timeout = 50000;
    axios.defaults.timeout = this.timeout;
  }

  async submitResults(reportPath: string, config: ReportConfig) {
    if (config.format === undefined)
      throw new XrayErrorResponse("ERROR: format must be specified");

    if (!this.supportedFormats.includes(config.format))
      throw new XrayErrorResponse("ERROR: unsupported format " + config.format);

    let endpointUrl;
    if (config.format === XRAY_FORMAT) {
      endpointUrl = this.jiraBaseUrl + "/rest/raven/2.0/import/execution";
    } else {
      endpointUrl =
        this.jiraBaseUrl + "/rest/raven/2.0/import/execution/" + config.format;
    }

    let authorizationHeaderValue;
    if (this.jiraToken !== undefined) {
      authorizationHeaderValue = "Bearer " + this.jiraToken;
    } else {
      authorizationHeaderValue =
        "Basic " + Buffer.from(this.jiraUsername + ":" + this.jiraPassword).toString('base64');
    }

    let reportContent;
    try {
      reportContent = fs.readFileSync(reportPath).toString();
    } catch (error: any) {
      throw new XrayErrorResponse(error.message);
    }

    // for xray, cucumber and behave reports send the report directly on the body
    if ([XRAY_FORMAT, CUCUMBER_FORMAT, BEHAVE_FORMAT].includes(config.format)) {
      // use a CancelToken as the timeout setting is not reliable
      const cancelTokenSource = axios.CancelToken.source();
      const timeoutFn = setTimeout(() => {
        cancelTokenSource.cancel("request timeout");
      }, this.timeout);

      return axios
        .post(endpointUrl, reportContent, {
          timeout: this.timeout,
          cancelToken: cancelTokenSource.token,
          headers: {
            Authorization: authorizationHeaderValue,
            "Content-Type": "application/json",
          },
        })
        .then((response) => {
          clearTimeout(timeoutFn);
          return new XrayDatacenterResponseV2(response);
        })
        .catch((error) => {
          throw new XrayErrorResponse(error.response);
        });
    } else {
      interface IParams {
        projectKey?: string;
        testPlanKey?: string;
        testExecKey?: string;
        fixVersion?: string;
        revision?: string;
        testEnvironments?: string;
      }
      const params: IParams = {};
      if (config.projectKey === undefined && config.testExecKey === undefined) {
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
      const url = endpointUrl + "?" + urlParams;
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
      bodyFormData.append("file", reportContent, fileName);

      // use a CancelToken as the timeout setting is not reliable
      const cancelTokenSource = axios.CancelToken.source();
      const timeoutFn = setTimeout(() => {
        cancelTokenSource.cancel("request timeout");
      }, this.timeout);

      return axios
        .post(url, bodyFormData, {
          timeout: this.timeout,
          cancelToken: cancelTokenSource.token,
          headers: {
            Authorization: authorizationHeaderValue,
            ...bodyFormData.getHeaders(),
          },
        })
        .then((response) => {
          clearTimeout(timeoutFn);
          return new XrayDatacenterResponseV2(response);
        })
        .catch((error) => {
          throw new XrayErrorResponse(error.message || error.response);
        });
    }
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

    let endpointUrl;
    if (config.format === XRAY_FORMAT) {
      endpointUrl =
        this.jiraBaseUrl + "/rest/raven/2.0/import/execution/multipart";
    } else {
      endpointUrl =
        this.jiraBaseUrl +
        "/rest/raven/2.0/import/execution/" +
        config.format +
        "/multipart";
    }

    let authorizationHeaderValue;
    if (this.jiraToken !== undefined) {
      authorizationHeaderValue = "Bearer " + this.jiraToken;
    } else {
      authorizationHeaderValue =
        "Basic " + Buffer.from(this.jiraUsername + ":" + this.jiraPassword).toString('base64');
    }

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
        testExecInfoContent = fs
          .readFileSync(config.testExecInfoFile)
          .toString();
      else testExecInfoContent = config.testExecInfo.toString();
    } catch (error: any) {
      throw new XrayErrorResponse(error.message);
    }

    const bodyFormData = new FormData();
    let filePartName;
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
      filePartName = "file";
      fileName = "report.xml";
    } else {
      filePartName = "result";
      fileName = "report.json";
    }
    bodyFormData.append(filePartName, reportContent, fileName);
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

    // use a CancelToken as the timeout setting is not reliable
    const cancelTokenSource = axios.CancelToken.source();
    const timeoutFn = setTimeout(() => {
      cancelTokenSource.cancel("request timeout");
    }, this.timeout);

    return axios
      .post(endpointUrl, bodyFormData, {
        timeout: this.timeout,
        cancelToken: cancelTokenSource.token,
        headers: {
          Authorization: authorizationHeaderValue,
          ...bodyFormData.getHeaders(),
        },
      })
      .then((response) => {
        clearTimeout(timeoutFn);
        return new XrayDatacenterResponseV2(response);
      })
      .catch((error) => {
        throw new XrayErrorResponse(error.response);
      });
  }

  async associateTestExecutionToTestPlan(
    testExecKey: string,
    testPlanKey: string
  ) {
    let authorizationHeaderValue;
    if (this.jiraToken !== undefined) {
      authorizationHeaderValue = "Bearer " + this.jiraToken;
    } else {
      authorizationHeaderValue =
        "Basic " + Buffer.from(this.jiraUsername + ":" + this.jiraPassword).toString('base64');
    }

    const content = {
      add: [testExecKey],
    };

    const endpointUrl = `${this.jiraBaseUrl}/rest/raven/2.0/api/testplan/${testPlanKey}/testexecution`;

    // use a CancelToken as the timeout setting is not reliable
    const cancelTokenSource = axios.CancelToken.source();
    const timeoutFn = setTimeout(() => {
      cancelTokenSource.cancel("request timeout");
    }, this.timeout);

    return axios
      .post(endpointUrl, content, {
        timeout: this.timeout,
        cancelToken: cancelTokenSource.token,
        headers: {
          Authorization: authorizationHeaderValue,
          "Content-Type": "application/json",
        },
      })
      .then((response) => {
        clearTimeout(timeoutFn);
        if (response.data.length === 0) return testExecKey;
        else throw new XrayErrorResponse(response.data[0]);
      })
      .catch((error) => {
        if (error instanceof XrayErrorResponse) throw error;
        else throw new XrayErrorResponse(error.response);
      });
  }
}

/// export default { XrayClient };
