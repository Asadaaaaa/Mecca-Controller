import { QuotationController } from '#controllersPrimaryV1';
import { Authorization } from '#middlewaresPrimaryV1';

class QuotationRoute {
    constructor(server, endpointPrefix) {
        this.server = server;
        this.API = server.API;
        this.endpointPrefix = endpointPrefix + '/quotations';
        this.Authorization = new Authorization(this.server);
        this.QuotationController = new QuotationController(this.server);

        this.routes();
    }

    routes() {
        const auth = this.Authorization.check();

        // Metrics endpoint (must be declared before :id route)
        this.API.get(this.endpointPrefix + '/metrics', auth, (req, res) => this.QuotationController.metrics(req, res));

        // Batch delete endpoint
        this.API.post(this.endpointPrefix + '/batch-delete', auth, (req, res) => this.QuotationController.batchDelete(req, res));

        // Workflow action endpoints
        this.API.post(this.endpointPrefix + '/:id/approve', auth, (req, res) => this.QuotationController.approve(req, res));
        this.API.post(this.endpointPrefix + '/:id/reject', auth, (req, res) => this.QuotationController.reject(req, res));
        this.API.post(this.endpointPrefix + '/:id/convert-to-so', auth, (req, res) => this.QuotationController.convertToOrder(req, res));

        // CRUD endpoints
        this.API.get(this.endpointPrefix, auth, (req, res) => this.QuotationController.list(req, res));
        this.API.get(this.endpointPrefix + '/:id', auth, (req, res) => this.QuotationController.get(req, res));
        this.API.post(this.endpointPrefix, auth, (req, res) => this.QuotationController.create(req, res));
        this.API.put(this.endpointPrefix + '/:id', auth, (req, res) => this.QuotationController.update(req, res));
        this.API.delete(this.endpointPrefix + '/:id', auth, (req, res) => this.QuotationController.delete(req, res));
    }
}

export default QuotationRoute;
