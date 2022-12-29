export class XrayDatacenterResponseV1 {
  public id?: string;
  public key?: string;
  public _response: string;
  public selfUrl?: string;

  constructor(response: any) {
    this._response = response;
    if (response.data !== undefined) {
      this.id = response.data.id;
      this.key = response.data.key;
      this.selfUrl = response.data.self;
    }
  }
}

export default XrayDatacenterResponseV1;
