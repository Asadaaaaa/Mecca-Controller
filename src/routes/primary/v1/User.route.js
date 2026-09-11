import { UserController } from '#controllersPrimaryV1';
import { Authorization } from '#middlewaresPrimaryV1';

class UserRoute {
    constructor(server, endpointPrefix) {
        this.server = server;
        this.API = server.API;
        this.endpointPrefix = endpointPrefix + '/users';
        this.Authorization = new Authorization(this.server);
        this.UserController = new UserController(this.server);

        this.routes();
    }

    routes() {
        const auth = this.Authorization.check();

        // Metrics endpoint (must be declared before :id route)
        this.API.get(this.endpointPrefix + '/metrics', auth, (req, res) => this.UserController.metrics(req, res));

        // CRUD endpoints
        this.API.get(this.endpointPrefix, auth, (req, res) => this.UserController.list(req, res));
        this.API.get(this.endpointPrefix + '/:id', auth, (req, res) => this.UserController.get(req, res));
        this.API.post(this.endpointPrefix, auth, (req, res) => this.UserController.create(req, res));
        this.API.put(this.endpointPrefix + '/:id', auth, (req, res) => this.UserController.update(req, res));
        this.API.delete(this.endpointPrefix + '/:id', auth, (req, res) => this.UserController.delete(req, res));
    }
}

export default UserRoute;
