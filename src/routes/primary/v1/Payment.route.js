import { PaymentController } from '#controllersPrimaryV1';
import { Authorization } from '#middlewaresPrimaryV1';

class PaymentRoute {
    constructor(server, endpointPrefix) {
        this.server = server;
        this.API = server.API;
        this.endpointPrefix = endpointPrefix + '/payments';
        this.Authorization = new Authorization(this.server);
        this.PaymentController = new PaymentController(this.server);

        this.routes();
    }

    routes() {
        const auth = this.Authorization.check();

        // Metrics endpoint (must be declared before :id route)
        this.API.get(this.endpointPrefix + '/metrics', auth, (req, res) => this.PaymentController.metrics(req, res));

        // Batch delete endpoint
        this.API.post(this.endpointPrefix + '/batch-delete', auth, (req, res) => this.PaymentController.batchDelete(req, res));

        // CRUD endpoints
        this.API.get(this.endpointPrefix, auth, (req, res) => this.PaymentController.list(req, res));
        this.API.get(this.endpointPrefix + '/:id', auth, (req, res) => this.PaymentController.get(req, res));
        this.API.post(this.endpointPrefix, auth, (req, res) => this.PaymentController.create(req, res));
        this.API.put(this.endpointPrefix + '/:id', auth, (req, res) => this.PaymentController.update(req, res));
        this.API.delete(this.endpointPrefix + '/:id', auth, (req, res) => this.PaymentController.delete(req, res));
    }
}

export default PaymentRoute;
