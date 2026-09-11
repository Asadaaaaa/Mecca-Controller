import { WarehouseController } from '#controllersPrimaryV1';
import { Authorization } from '#middlewaresPrimaryV1';

class WarehouseRoute {
    constructor(server, endpointPrefix) {
        this.server = server;
        this.API = server.API;
        this.endpointPrefix = endpointPrefix + '/warehouses';
        this.Authorization = new Authorization(this.server);
        this.WarehouseController = new WarehouseController(this.server);

        this.routes();
    }

    routes() {
        const auth = this.Authorization.check();

        // Metrics endpoint (must be declared before :id route)
        this.API.get(this.endpointPrefix + '/metrics', auth, (req, res) => this.WarehouseController.metrics(req, res));

        // CRUD endpoints
        this.API.get(this.endpointPrefix, auth, (req, res) => this.WarehouseController.list(req, res));
        this.API.get(this.endpointPrefix + '/:id', auth, (req, res) => this.WarehouseController.get(req, res));
        this.API.post(this.endpointPrefix, auth, (req, res) => this.WarehouseController.create(req, res));
        this.API.put(this.endpointPrefix + '/:id', auth, (req, res) => this.WarehouseController.update(req, res));
        this.API.delete(this.endpointPrefix + '/:id', auth, (req, res) => this.WarehouseController.delete(req, res));
    }
}

export default WarehouseRoute;
