class XrayCloudResponseV2 {

    constructor(response) {
        this._response = response;
        if (response.data !== undefined) {
            this.id = response.data.id;
            this.key = response.data.key;
            this.selfUrl = response.data.self;
        }
    }

}

//module.exports = XrayCloudResponseV2;
export default XrayCloudResponseV2;