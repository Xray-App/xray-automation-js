export class XrayErrorResponse {
  public _response: string;
  public statusCode?: string;
  public body?: string;

  constructor(response: any) {
    this._response = response;
    if (response !== undefined && response.status !== undefined)
      this.statusCode = response.status;
    if (response !== undefined && response.data !== undefined)
      this.body = response.data;
  }

  toString() {
    return this._response;
  }
}

export default XrayErrorResponse;
