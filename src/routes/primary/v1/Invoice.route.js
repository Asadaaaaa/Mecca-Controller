import { InvoiceController } from '#controllersPrimaryV1';
import { Authorization } from '#middlewaresPrimaryV1';

class InvoiceRoute {
    constructor(server, endpointPrefix) {
        this.server = server;
        this.API = server.API;
        this.endpointPrefix = endpointPrefix + '/invoices';
        this.Authorization = new Authorization(this.server);
        this.InvoiceController = new InvoiceController(this.server);

        this.routes();
    }

    routes() {
        const auth = this.Authorization.check();

        // Metrics endpoint (must be declared before :id route)
        this.API.get(this.endpointPrefix + '/metrics', auth, (req, res) => this.InvoiceController.metrics(req, res));

        // Batch delete endpoint
        this.API.post(this.endpointPrefix + '/batch-delete', auth, (req, res) => this.InvoiceController.batchDelete(req, res));

        // CRUD endpoints
        this.API.get(this.endpointPrefix, auth, (req, res) => this.InvoiceController.list(req, res));
        this.API.get(this.endpointPrefix + '/:id', auth, (req, res) => this.InvoiceController.get(req, res));
        this.API.post(this.endpointPrefix, auth, (req, res) => this.InvoiceController.create(req, res));
        this.API.put(this.endpointPrefix + '/:id', auth, (req, res) => this.InvoiceController.update(req, res));
        this.API.delete(this.endpointPrefix + '/:id', auth, (req, res) => this.InvoiceController.delete(req, res));
    }
}

export default InvoiceRoute;
