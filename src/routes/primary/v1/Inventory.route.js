import { InventoryController } from '#controllersPrimaryV1';
import { Authorization } from '#middlewaresPrimaryV1';

class InventoryRoute {
    constructor(server, endpointPrefix) {
        this.server = server;
        this.API = server.API;
        this.endpointPrefix = endpointPrefix + '/inventory';
        this.Authorization = new Authorization(this.server);
        this.InventoryController = new InventoryController(this.server);

        this.routes();
    }

    routes() {
        const auth = this.Authorization.check();

        // 1. Stocks Endpoints
        this.API.get(this.endpointPrefix + '/stocks/metrics', auth, (req, res) => this.InventoryController.stockMetrics(req, res));
        this.API.post(this.endpointPrefix + '/stocks/adjustment', auth, (req, res) => this.InventoryController.stockAdjustment(req, res));
        this.API.post(this.endpointPrefix + '/stocks/batch-delete', auth, (req, res) => this.InventoryController.batchDeleteStocks(req, res));
        this.API.delete(this.endpointPrefix + '/stocks/:id', auth, (req, res) => this.InventoryController.deleteStock(req, res));
        this.API.get(this.endpointPrefix + '/stocks', auth, (req, res) => this.InventoryController.listStocks(req, res));

        // 2. Stock Movements
        this.API.get(this.endpointPrefix + '/movements', auth, (req, res) => this.InventoryController.listMovements(req, res));

        // 3. Stock Opnames
        this.API.get(this.endpointPrefix + '/opnames/metrics', auth, (req, res) => this.InventoryController.opnameMetrics(req, res));
        this.API.get(this.endpointPrefix + '/opnames/:id', auth, (req, res) => this.InventoryController.getOpname(req, res));
        this.API.post(this.endpointPrefix + '/opnames/:id/approve', auth, (req, res) => this.InventoryController.approveOpname(req, res));
        this.API.get(this.endpointPrefix + '/opnames', auth, (req, res) => this.InventoryController.listOpnames(req, res));
        this.API.post(this.endpointPrefix + '/opnames', auth, (req, res) => this.InventoryController.createOpname(req, res));

        // 4. Stock Wastes
        this.API.get(this.endpointPrefix + '/wastes/metrics', auth, (req, res) => this.InventoryController.wasteMetrics(req, res));
        this.API.post(this.endpointPrefix + '/wastes/:id/approve', auth, (req, res) => this.InventoryController.approveWaste(req, res));
        this.API.get(this.endpointPrefix + '/wastes', auth, (req, res) => this.InventoryController.listWastes(req, res));
        this.API.post(this.endpointPrefix + '/wastes', auth, (req, res) => this.InventoryController.createWaste(req, res));
    }
}

export default InventoryRoute;
