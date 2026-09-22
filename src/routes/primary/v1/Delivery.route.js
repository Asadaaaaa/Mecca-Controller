import { DeliveryController } from '#controllersPrimaryV1';
import { Authorization } from '#middlewaresPrimaryV1';

class DeliveryRoute {
    constructor(server, endpointPrefix) {
        this.server = server;
        this.API = server.API;
        this.endpointPrefix = endpointPrefix + '/deliveries';
        this.Authorization = new Authorization(this.server);
        this.DeliveryController = new DeliveryController(this.server);

        this.routes();
    }

    routes() {
        const auth = this.Authorization.check();

        // Metrics endpoint (must be declared before :id route)
        this.API.get(this.endpointPrefix + '/metrics', auth, (req, res) => this.DeliveryController.metrics(req, res));

        // Batch delete endpoint
        this.API.post(this.endpointPrefix + '/batch-delete', auth, (req, res) => this.DeliveryController.batchDelete(req, res));

        // Delivery actions (Confirm / Send out with stock deduction, and Complete / Delivered)
        this.API.post(this.endpointPrefix + '/:id/confirm', auth, (req, res) => this.DeliveryController.confirm(req, res));
        this.API.post(this.endpointPrefix + '/:id/complete', auth, (req, res) => this.DeliveryController.complete(req, res));

        // CRUD endpoints
        this.API.get(this.endpointPrefix, auth, (req, res) => this.DeliveryController.list(req, res));
        this.API.get(this.endpointPrefix + '/:id', auth, (req, res) => this.DeliveryController.get(req, res));
        this.API.post(this.endpointPrefix, auth, (req, res) => this.DeliveryController.create(req, res));
        this.API.delete(this.endpointPrefix + '/:id', auth, (req, res) => this.DeliveryController.delete(req, res));
    }
}

export default DeliveryRoute;
