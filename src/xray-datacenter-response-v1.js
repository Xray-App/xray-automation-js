class XrayDatacenterResponseV1 {

    constructor(response) {
        this._response = response;
        this.id = response.data.id;
        this.key = response.data.key;
        this.selfUrl = response.data.self;
    }
}

//module.exports = XrayDatacenterResponseV1;
export default XrayDatacenterResponseV1;