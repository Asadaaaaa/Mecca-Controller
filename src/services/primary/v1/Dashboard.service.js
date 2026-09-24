import { DashboardRepository } from "#repositoriesPrimaryV1";

class DashboardService {
    constructor(server) {
        this.server = server;
        this.dashboardRepo = new DashboardRepository(this.server);
    }

    getDefaultDateRange() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const startDate = `${yyyy}-${mm}-01`;
        const endDate = now.toISOString().slice(0, 10);
        return { startDate, endDate };
    }

    async getMetrics(query = {}) {
        const defaults = this.getDefaultDateRange();
        const startDate = query.start_date || defaults.startDate;
        const endDate = query.end_date || defaults.endDate;

        return await this.dashboardRepo.getMetrics(startDate, endDate);
    }

    async getRecentTransactions(limit = 5) {
        const l = parseInt(limit, 10) || 5;
        return await this.dashboardRepo.getRecentTransactions(l);
    }

    async getSalesTrend(query = {}) {
        const defaults = this.getDefaultDateRange();
        const startDate = query.start_date || defaults.startDate;
        const endDate = query.end_date || defaults.endDate;

        return await this.dashboardRepo.getSalesTrend(startDate, endDate);
    }
}

export default DashboardService;
