export class XrayCloudGraphQLErrorResponse {
  public error: string;
  public errorMessages: string[];

  constructor(error: string, errorMessages: string[]) {
    this.error = error;
    this.errorMessages = errorMessages;
  }
}

export default XrayCloudGraphQLErrorResponse;
