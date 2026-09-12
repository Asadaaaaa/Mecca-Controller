import { ProductCategoryController } from '#controllersPrimaryV1';
import { Authorization } from '#middlewaresPrimaryV1';

class ProductCategoryRoute {
    constructor(server, endpointPrefix) {
        this.server = server;
        this.API = server.API;
        this.endpointPrefix = endpointPrefix + '/product-categories';
        this.Authorization = new Authorization(this.server);
        this.ProductCategoryController = new ProductCategoryController(this.server);

        this.routes();
    }

    routes() {
        const auth = this.Authorization.check();

        // Metrics endpoint (must be declared before :id route)
        this.API.get(this.endpointPrefix + '/metrics', auth, (req, res) => this.ProductCategoryController.metrics(req, res));

        // CRUD endpoints
        this.API.get(this.endpointPrefix, auth, (req, res) => this.ProductCategoryController.list(req, res));
        this.API.get(this.endpointPrefix + '/:id', auth, (req, res) => this.ProductCategoryController.get(req, res));
        this.API.post(this.endpointPrefix, auth, (req, res) => this.ProductCategoryController.create(req, res));
        this.API.put(this.endpointPrefix + '/:id', auth, (req, res) => this.ProductCategoryController.update(req, res));
        this.API.delete(this.endpointPrefix + '/:id', auth, (req, res) => this.ProductCategoryController.delete(req, res));
    }
}

export default ProductCategoryRoute;
