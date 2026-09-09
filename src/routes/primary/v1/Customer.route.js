import { CustomerController } from '#controllersPrimaryV1';
import { Authorization } from '#middlewaresPrimaryV1';

class CustomerRoute {
    constructor(server, endpointPrefix) {
        this.server = server;
        this.API = server.API;
        this.endpointPrefix = endpointPrefix + '/customers';
        this.Authorization = new Authorization(this.server);
        this.CustomerController = new CustomerController(this.server);

        this.routes();
    }

    routes() {
        const auth = this.Authorization.check();

        // Metrics endpoint (must be declared before :id route)
        this.API.get(this.endpointPrefix + '/metrics', auth, (req, res) => this.CustomerController.metrics(req, res));

        // Batch delete endpoint
        this.API.post(this.endpointPrefix + '/batch-delete', auth, (req, res) => this.CustomerController.batchDelete(req, res));

        // CRUD endpoints
        this.API.get(this.endpointPrefix, auth, (req, res) => this.CustomerController.list(req, res));
        this.API.get(this.endpointPrefix + '/:id', auth, (req, res) => this.CustomerController.get(req, res));
        this.API.post(this.endpointPrefix, auth, (req, res) => this.CustomerController.create(req, res));
        this.API.put(this.endpointPrefix + '/:id', auth, (req, res) => this.CustomerController.update(req, res));
        this.API.delete(this.endpointPrefix + '/:id', auth, (req, res) => this.CustomerController.delete(req, res));
    }
}

export default CustomerRoute;
