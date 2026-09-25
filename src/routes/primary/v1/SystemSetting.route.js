import { SystemSettingController } from '#controllersPrimaryV1';
import { Authorization } from '#middlewaresPrimaryV1';

class SystemSettingRoute {
    constructor(server, endpointPrefix) {
        this.server = server;
        this.API = server.API;
        this.endpointPrefix = endpointPrefix + '/settings/system';
        this.Authorization = new Authorization(this.server);
        this.settingController = new SystemSettingController(this.server);

        this.routes();
    }

    routes() {
        const auth = this.Authorization.check();

        this.API.get(this.endpointPrefix, auth, (req, res) => this.settingController.getSettings(req, res));
        this.API.put(this.endpointPrefix + '/pin', auth, (req, res) => this.settingController.updatePin(req, res));
        this.API.put(this.endpointPrefix + '/force-sales-order', auth, (req, res) => this.settingController.updateForceSalesOrder(req, res));
        this.API.post(this.endpointPrefix + '/verify-pin', auth, (req, res) => this.settingController.verifyPin(req, res));
    }
}

export default SystemSettingRoute;
