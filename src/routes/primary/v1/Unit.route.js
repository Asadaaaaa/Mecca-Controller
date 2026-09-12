import { UnitController } from '#controllersPrimaryV1';
import { Authorization } from '#middlewaresPrimaryV1';

class UnitRoute {
    constructor(server, endpointPrefix) {
        this.server = server;
        this.API = server.API;
        this.endpointPrefix = endpointPrefix + '/units';
        this.Authorization = new Authorization(this.server);
        this.UnitController = new UnitController(this.server);

        this.routes();
    }

    routes() {
        const auth = this.Authorization.check();

        this.API.get(this.endpointPrefix, auth, (req, res) => this.UnitController.list(req, res));
        this.API.get(this.endpointPrefix + '/:id', auth, (req, res) => this.UnitController.get(req, res));
        this.API.post(this.endpointPrefix, auth, (req, res) => this.UnitController.create(req, res));
        this.API.put(this.endpointPrefix + '/:id', auth, (req, res) => this.UnitController.update(req, res));
        this.API.delete(this.endpointPrefix + '/:id', auth, (req, res) => this.UnitController.delete(req, res));
    }
}

export default UnitRoute;
