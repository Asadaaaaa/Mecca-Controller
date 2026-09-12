import { ProductController } from '#controllersPrimaryV1';
import { Authorization } from '#middlewaresPrimaryV1';

class ProductRoute {
    constructor(server, endpointPrefix) {
        this.server = server;
        this.API = server.API;
        this.endpointPrefix = endpointPrefix + '/products';
        this.Authorization = new Authorization(this.server);
        this.ProductController = new ProductController(this.server);

        this.routes();
    }

    routes() {
        const auth = this.Authorization.check();

        // Metrics endpoint (must be declared before :id route)
        this.API.get(this.endpointPrefix + '/metrics', auth, (req, res) => this.ProductController.metrics(req, res));

        // Batch delete endpoint
        this.API.post(this.endpointPrefix + '/batch-delete', auth, (req, res) => this.ProductController.batchDelete(req, res));

        // CRUD endpoints
        this.API.get(this.endpointPrefix, auth, (req, res) => this.ProductController.list(req, res));
        this.API.get(this.endpointPrefix + '/:id', auth, (req, res) => this.ProductController.get(req, res));
        this.API.post(this.endpointPrefix, auth, (req, res) => this.ProductController.create(req, res));
        this.API.put(this.endpointPrefix + '/:id', auth, (req, res) => this.ProductController.update(req, res));
        this.API.delete(this.endpointPrefix + '/:id', auth, (req, res) => this.ProductController.delete(req, res));
    }
}

export default ProductRoute;
