import { ResponsePresetHelper } from '#helpers';
import { DashboardService } from '#servicesPrimaryV1';

class DashboardController {
    constructor(server) {
        this.server = server;
        this.ResponsePreset = new ResponsePresetHelper();
        this.DashboardService = new DashboardService(this.server);
    }

    async metrics(req, res) {
        try {
            const result = await this.DashboardService.getMetrics(req.query);
            return res.status(200).json(this.ResponsePreset.resOK('OK', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async recentTransactions(req, res) {
        try {
            const limit = req.query.limit || 5;
            const result = await this.DashboardService.getRecentTransactions(limit);
            return res.status(200).json(this.ResponsePreset.resOK('OK', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async salesTrend(req, res) {
        try {
            const result = await this.DashboardService.getSalesTrend(req.query);
            return res.status(200).json(this.ResponsePreset.resOK('OK', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }
}

export default DashboardController;
