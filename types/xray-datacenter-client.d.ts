import type { XraySettings } from "../types/xray-settings";
import type { ReportConfig } from "../types/report-config";
import XrayDatacenterResponseV2 from "./xray-datacenter-response-v2";
export declare class XrayDatacenterClient {
    xraySettings: XraySettings;
    jiraBaseUrl?: string;
    jiraUsername?: string;
    jiraPassword?: string;
    jiraToken?: string;
    timeout?: number;
    supportedFormats: string[];
    constructor(xraySettings: XraySettings);
    submitResults(reportPath: string, config: ReportConfig): Promise<XrayDatacenterResponseV2>;
    submitResultsMultipart(reportPath: string, config: ReportConfig): Promise<XrayDatacenterResponseV2>;
    associateTestExecutionToTestPlan(testExecKey: string, testPlanKey: string): Promise<string>;
}
