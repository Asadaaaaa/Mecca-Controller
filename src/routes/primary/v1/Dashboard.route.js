import { DashboardController } from '#controllersPrimaryV1';
import { Authorization } from '#middlewaresPrimaryV1';

class DashboardRoute {
    constructor(server, endpointPrefix) {
        this.server = server;
        this.API = server.API;
        this.endpointPrefix = endpointPrefix + '/dashboard';
        this.Authorization = new Authorization(this.server);
        this.DashboardController = new DashboardController(this.server);

        this.routes();
    }

    routes() {
        const auth = this.Authorization.check();

        this.API.get(this.endpointPrefix + '/metrics', auth, (req, res) => this.DashboardController.metrics(req, res));
        this.API.get(this.endpointPrefix + '/recent-transactions', auth, (req, res) => this.DashboardController.recentTransactions(req, res));
        this.API.get(this.endpointPrefix + '/sales-trend', auth, (req, res) => this.DashboardController.salesTrend(req, res));
    }
}

export default DashboardRoute;
