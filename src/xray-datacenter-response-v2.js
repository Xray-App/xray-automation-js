class XrayDatacenterResponseV2 {

    constructor(response) {
        this._response = response;
        if ((response.data !== undefined) && (response.data.testExecIssue !== undefined)) {
            this.id = response.data.testExecIssue.id;
            this.key = response.data.testExecIssue.key;
            this.selfUrl = response.data.testExecIssue.self;
        }
    }
    
}

//module.exports = XrayDatacenterResponseV2;
export default XrayDatacenterResponseV2;