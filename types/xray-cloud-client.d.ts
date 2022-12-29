import XrayCloudResponseV2 from "./xray-cloud-response-v2";
import { ReportConfig, XraySettings } from "./index";
export declare class XrayCloudClient {
    clientId?: string;
    clientSecret?: string;
    timeout?: number;
    supportedFormats: string[];
    constructor(xraySettings: XraySettings);
    submitResults(reportPath: string, config: ReportConfig): Promise<XrayCloudResponseV2>;
    submitResultsMultipart(reportPath: string, config: ReportConfig): Promise<XrayCloudResponseV2>;
    authenticate(): Promise<any>;
    associateTestExecutionToTestPlanByIds(testExecIssueId: string, testPlanIssueId: string): Promise<any>;
    getTestPlanId(testPlanIssueKey: string): Promise<any>;
}
export default XrayCloudClient;
