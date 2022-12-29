export class XrayCloudGraphQLResponseV2 {
  public id?: string;
  public key?: string;
  public _response: string;
  public selfUrl?: string;

  constructor(response: any) {
    this._response = response;
    if (
      response.data !== undefined &&
      response.data.testExecIssue !== undefined
    ) {
      this.id = response.data.testExecIssue.id;
      this.key = response.data.testExecIssue.key;
      this.selfUrl = response.data.testExecIssue.self;
    }
  }
}

export default XrayCloudGraphQLResponseV2;
