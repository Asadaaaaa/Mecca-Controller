import { RoleController } from '#controllersPrimaryV1';
import { Authorization } from '#middlewaresPrimaryV1';

class RoleRoute {
    constructor(server, endpointPrefix) {
        this.server = server;
        this.API = server.API;
        this.endpointPrefix = endpointPrefix;
        this.Authorization = new Authorization(this.server);
        this.RoleController = new RoleController(this.server);

        this.routes();
    }

    routes() {
        const auth = this.Authorization.check();

        // Permissions list endpoint
        this.API.get(this.endpointPrefix + '/permissions', auth, (req, res) => this.RoleController.permissions(req, res));

        // Roles endpoints
        this.API.get(this.endpointPrefix + '/roles/metrics', auth, (req, res) => this.RoleController.metrics(req, res));
        this.API.get(this.endpointPrefix + '/roles', auth, (req, res) => this.RoleController.list(req, res));
        this.API.get(this.endpointPrefix + '/roles/:id', auth, (req, res) => this.RoleController.get(req, res));
        this.API.post(this.endpointPrefix + '/roles', auth, (req, res) => this.RoleController.create(req, res));
        this.API.put(this.endpointPrefix + '/roles/:id', auth, (req, res) => this.RoleController.update(req, res));
        this.API.delete(this.endpointPrefix + '/roles/:id', auth, (req, res) => this.RoleController.delete(req, res));
    }
}

export default RoleRoute;
