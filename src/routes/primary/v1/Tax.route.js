import { TaxController } from '#controllersPrimaryV1';
import { Authorization } from '#middlewaresPrimaryV1';

class TaxRoute {
    constructor(server, endpointPrefix) {
        this.server = server;
        this.API = server.API;
        this.endpointPrefix = endpointPrefix + '/taxes';
        this.Authorization = new Authorization(this.server);
        this.TaxController = new TaxController(this.server);

        this.routes();
    }

    routes() {
        const auth = this.Authorization.check();

        this.API.get(this.endpointPrefix, auth, (req, res) => this.TaxController.list(req, res));
        this.API.get(this.endpointPrefix + '/:id', auth, (req, res) => this.TaxController.get(req, res));
        this.API.post(this.endpointPrefix, auth, (req, res) => this.TaxController.create(req, res));
        this.API.put(this.endpointPrefix + '/:id', auth, (req, res) => this.TaxController.update(req, res));
        this.API.delete(this.endpointPrefix + '/:id', auth, (req, res) => this.TaxController.delete(req, res));
    }
}

export default TaxRoute;
