class XrayErrorResponse {
    constructor(response) {
        this._response = response;
        if ((response !== undefined) && (response.status !== undefined))
            this.statusCode = response.status;
        if ((response !== undefined) && (response.data !== undefined))
            this.body = response.data;
    }
}

// module.exports = XrayErrorResponse;
export default XrayErrorResponse;