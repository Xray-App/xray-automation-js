import XrayDatacenterClient from './xray-datacenter-client.js';
import XrayCloudClient from './xray-cloud-client.js';
import XrayErrorResponse from './xray-error-response.js';
import XrayDatacenterResponseV1 from './xray-datacenter-response-v1.js';
import XrayDatacenterResponseV2 from './xray-datacenter-response-v2.js';
import XrayCloudResponseV2 from './xray-cloud-response-v2.js';

const XRAY_FORMAT = 'xray';
const JUNIT_FORMAT = 'junit';
const TESTNG_FORMAT = 'testng';
const ROBOT_FORMAT = 'robot';
const NUNIT_FORMAT = 'nunit';
const XUNIT_FORMAT = 'xunit';
const CUCUMBER_FORMAT = 'cucumber';
const BEHAVE_FORMAT = 'behave';

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
    XrayCloudClient,
    XrayErrorResponse,
    XrayDatacenterResponseV1,
    XrayDatacenterResponseV2,
    XrayCloudResponseV2
};