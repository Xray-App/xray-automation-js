import { XrayCloudClient } from "./xray-cloud-client";
import { XrayCloudResponseV2 } from "./xray-cloud-response-v2";
import { XrayCloudGraphQLResponseV2 } from "./xray-cloud-graphql-response-v2";
import { XrayCloudGraphQLErrorResponse } from "./xray-cloud-graphql-error-response";
import { XrayDatacenterClient } from "./xray-datacenter-client";
import type { XraySettings } from "../types/xray-settings";
import type { ReportConfig } from "../types/report-config";
import { XrayErrorResponse } from "./xray-error-response";
import { XrayDatacenterResponseV1 } from "./xray-datacenter-response-v1";
import { XrayDatacenterResponseV2 } from "./xray-datacenter-response-v2";

const XRAY_FORMAT = "xray";
const JUNIT_FORMAT = "junit";
const TESTNG_FORMAT = "testng";
const ROBOT_FORMAT = "robot";
const NUNIT_FORMAT = "nunit";
const XUNIT_FORMAT = "xunit";
const CUCUMBER_FORMAT = "cucumber";
const BEHAVE_FORMAT = "behave";

export {
  XRAY_FORMAT,
  JUNIT_FORMAT,
  TESTNG_FORMAT,
  ROBOT_FORMAT,
  NUNIT_FORMAT,
  XUNIT_FORMAT,
  CUCUMBER_FORMAT,
  BEHAVE_FORMAT,
  XrayDatacenterClient,
  XrayErrorResponse,
  XrayDatacenterResponseV1,
  XrayDatacenterResponseV2,
  XrayCloudClient,
  XrayCloudGraphQLResponseV2,
  XrayCloudGraphQLErrorResponse,
  XrayCloudResponseV2,
};

export type { XraySettings, ReportConfig };
