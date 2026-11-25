import { FormDraftController } from '#controllersPrimaryV1';
import { Authorization } from '#middlewaresPrimaryV1';

class FormDraftRoute {
    constructor(server, endpointPrefix) {
        this.server = server;
        this.API = server.API;
        this.endpointPrefix = endpointPrefix + '/drafts';
        this.Authorization = new Authorization(this.server);
        this.draftController = new FormDraftController(this.server);

        this.routes();
    }

    routes() {
        const auth = this.Authorization.check();

        this.API.get(this.endpointPrefix + '/:formKey', auth, (req, res) => this.draftController.get(req, res));
        this.API.put(this.endpointPrefix + '/:formKey', auth, (req, res) => this.draftController.save(req, res));
        this.API.delete(this.endpointPrefix + '/:formKey', auth, (req, res) => this.draftController.remove(req, res));
    }
}

export default FormDraftRoute;
