export type ReportConfig = {
  format: string;
  projectKey?: string;
  version?: string;
  revision?: string;
  testPlanKey?: string;
  testExecKey?: string;
  testEnvironment?: string;
  testEnvironments?: string[];
  testExecInfoFile?: string;
  testExecInfo?: any;
  testInfoFile?: string;
  testInfo?: any;
};
