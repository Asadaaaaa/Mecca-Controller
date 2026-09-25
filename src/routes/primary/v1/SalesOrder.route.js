import { SalesOrderController } from '#controllersPrimaryV1';
import { Authorization } from '#middlewaresPrimaryV1';

class SalesOrderRoute {
    constructor(server, endpointPrefix) {
        this.server = server;
        this.API = server.API;
        this.endpointPrefix = endpointPrefix + '/sales-orders';
        this.Authorization = new Authorization(this.server);
        this.SalesOrderController = new SalesOrderController(this.server);

        this.routes();
    }

    routes() {
        const auth = this.Authorization.check();

        // Metrics endpoint (must be declared before :id route)
        this.API.get(this.endpointPrefix + '/metrics', auth, (req, res) => this.SalesOrderController.metrics(req, res));

        // Available stock endpoint (must be declared before :id route)
        this.API.get(this.endpointPrefix + '/available-stock', auth, (req, res) => this.SalesOrderController.availableStock(req, res));

        // Batch delete endpoint
        this.API.post(this.endpointPrefix + '/batch-delete', auth, (req, res) => this.SalesOrderController.batchDelete(req, res));

        // Workflow action endpoints
        this.API.post(this.endpointPrefix + '/:id/confirm', auth, (req, res) => this.SalesOrderController.confirm(req, res));
        this.API.post(this.endpointPrefix + '/:id/cancel', auth, (req, res) => this.SalesOrderController.cancel(req, res));

        // CRUD endpoints
        this.API.get(this.endpointPrefix, auth, (req, res) => this.SalesOrderController.list(req, res));
        this.API.get(this.endpointPrefix + '/:id', auth, (req, res) => this.SalesOrderController.get(req, res));
        this.API.post(this.endpointPrefix, auth, (req, res) => this.SalesOrderController.create(req, res));
        this.API.put(this.endpointPrefix + '/:id', auth, (req, res) => this.SalesOrderController.update(req, res));
        this.API.delete(this.endpointPrefix + '/:id', auth, (req, res) => this.SalesOrderController.delete(req, res));
    }
}

export default SalesOrderRoute;
