import { Op } from "sequelize";

class DashboardRepository {
    constructor(server) {
        this.server = server;
    }

    get invoiceTable() {
        return this.server.model?.invoices?.table;
    }

    get paymentTable() {
        return this.server.model?.payments?.table;
    }

    get salesOrderTable() {
        return this.server.model?.salesOrders?.table;
    }

    get customerTable() {
        return this.server.model?.customers?.table;
    }

    async getMetrics(startDate, endDate) {
        if (!this.invoiceTable || !this.paymentTable) {
            return {
                totalSales: 0,
                unpaidSales: 0,
                paidSales: 0,
                transactions: 0,
                growthRate: "+0%",
                unpaidRatio: "0%",
                paidRatio: "0%",
                transactionGrowth: "+0%"
            };
        }

        // Calculate previous period of same duration
        const start = new Date(startDate);
        const end = new Date(endDate);
        const durationDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);

        const prevEnd = new Date(start);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - durationDays + 1);

        const prevStartStr = prevStart.toISOString().slice(0, 10);
        const prevEndStr = prevEnd.toISOString().slice(0, 10);

        // 1. Current Period Invoices
        const invoices = await this.invoiceTable.findAll({
            where: {
                invoice_date: {
                    [Op.between]: [startDate, endDate]
                },
                status: {
                    [Op.ne]: 'Dibatalkan'
                }
            },
            attributes: ['id', 'grand_total', 'paid_amount', 'status']
        });

        let totalSales = 0;
        let invoiceCount = invoices.length;

        for (const inv of invoices) {
            totalSales += parseFloat(inv.grand_total) || 0;
        }

        // If no invoices in range, fallback to sales orders for totalSales
        if (totalSales === 0 && this.salesOrderTable) {
            const orders = await this.salesOrderTable.findAll({
                where: {
                    order_date: {
                        [Op.between]: [startDate, endDate]
                    },
                    status: {
                        [Op.ne]: 'CANCELLED'
                    }
                },
                attributes: ['grand_total']
            });
            for (const ord of orders) {
                totalSales += parseFloat(ord.grand_total) || 0;
            }
            invoiceCount = Math.max(invoiceCount, orders.length);
        }

        // 2. Previous Period Invoices for Growth
        const prevInvoices = await this.invoiceTable.findAll({
            where: {
                invoice_date: {
                    [Op.between]: [prevStartStr, prevEndStr]
                },
                status: {
                    [Op.ne]: 'Dibatalkan'
                }
            },
            attributes: ['grand_total']
        });

        let prevTotalSales = 0;
        for (const inv of prevInvoices) {
            prevTotalSales += parseFloat(inv.grand_total) || 0;
        }

        const prevCount = prevInvoices.length;

        // 3. Paid Amount in Current Period
        const payments = await this.paymentTable.findAll({
            where: {
                payment_date: {
                    [Op.between]: [startDate, endDate]
                },
                status: 'Terverifikasi'
            },
            attributes: ['amount']
        });

        let paidSales = 0;
        for (const p of payments) {
            paidSales += parseFloat(p.amount) || 0;
        }

        // 4. Unpaid Sales (Active Receivables up to end date)
        const unpaidInvoices = await this.invoiceTable.findAll({
            where: {
                invoice_date: {
                    [Op.lte]: endDate
                },
                status: {
                    [Op.in]: ['Belum Dibayar', 'Sebagian', 'Jatuh Tempo']
                }
            },
            attributes: ['grand_total', 'paid_amount']
        });

        let unpaidSales = 0;
        for (const inv of unpaidInvoices) {
            const grand = parseFloat(inv.grand_total) || 0;
            const paid = parseFloat(inv.paid_amount) || 0;
            unpaidSales += Math.max(0, grand - paid);
        }

        // Calculations
        let growthRate = "+0.0%";
        if (prevTotalSales > 0) {
            const diffPct = ((totalSales - prevTotalSales) / prevTotalSales) * 100;
            growthRate = (diffPct >= 0 ? `+${diffPct.toFixed(1)}%` : `${diffPct.toFixed(1)}%`);
        } else if (totalSales > 0) {
            growthRate = "+100.0%";
        }

        let transactionGrowth = "+0.0%";
        if (prevCount > 0) {
            const diffPct = ((invoiceCount - prevCount) / prevCount) * 100;
            transactionGrowth = (diffPct >= 0 ? `+${diffPct.toFixed(1)}%` : `${diffPct.toFixed(1)}%`);
        } else if (invoiceCount > 0) {
            transactionGrowth = "+100.0%";
        }

        const unpaidRatio = totalSales > 0 ? `${Math.min(100, Math.round((unpaidSales / totalSales) * 100))}%` : "0%";
        const paidRatio = totalSales > 0 ? `${Math.min(100, Math.round((paidSales / totalSales) * 100))}%` : "0%";

        return {
            totalSales,
            unpaidSales,
            paidSales,
            transactions: invoiceCount,
            growthRate,
            unpaidRatio,
            paidRatio,
            transactionGrowth
        };
    }

    async getRecentTransactions(limit = 5) {
        const results = [];

        // 1. Invoices
        if (this.invoiceTable) {
            const recentInvoices = await this.invoiceTable.findAll({
                include: [
                    {
                        model: this.customerTable,
                        as: 'customer',
                        attributes: ['id', 'name']
                    }
                ],
                order: [['created_at', 'DESC']],
                limit: limit
            });

            for (const inv of recentInvoices) {
                results.push({
                    type: 'invoice',
                    code: inv.invoice_number,
                    customer: inv.customer?.name || '-',
                    title: `Faktur Penjualan #${inv.invoice_number}`,
                    action: `Penerbitan tagihan kepada ${inv.customer?.name || 'Customer'}`,
                    amount: parseFloat(inv.grand_total) || 0,
                    status: inv.status,
                    date: inv.invoice_date,
                    created_at: inv.created_at
                });
            }
        }

        // 2. Payments
        if (this.paymentTable) {
            const recentPayments = await this.paymentTable.findAll({
                include: [
                    {
                        model: this.customerTable,
                        as: 'customer',
                        attributes: ['id', 'name']
                    }
                ],
                order: [['created_at', 'DESC']],
                limit: limit
            });

            for (const pay of recentPayments) {
                results.push({
                    type: 'payment',
                    code: pay.payment_number,
                    customer: pay.customer?.name || '-',
                    title: `Penerimaan Kas #${pay.payment_number}`,
                    action: `Pembayaran masuk via ${pay.payment_method || 'Kas/Bank'}`,
                    amount: parseFloat(pay.amount) || 0,
                    status: pay.status,
                    date: pay.payment_date,
                    created_at: pay.created_at
                });
            }
        }

        // Sort descending by created_at and slice limit
        results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return results.slice(0, limit);
    }

    async getSalesTrend(startDate, endDate) {
        if (!this.invoiceTable) return [];

        const invoices = await this.invoiceTable.findAll({
            where: {
                invoice_date: {
                    [Op.between]: [startDate, endDate]
                },
                status: {
                    [Op.ne]: 'Dibatalkan'
                }
            },
            attributes: ['invoice_date', 'grand_total', 'paid_amount']
        });

        const payments = await this.paymentTable.findAll({
            where: {
                payment_date: {
                    [Op.between]: [startDate, endDate]
                },
                status: 'Terverifikasi'
            },
            attributes: ['payment_date', 'amount']
        });

        // Group by date
        const dateMap = {};

        // Generate date series
        const curr = new Date(startDate);
        const end = new Date(endDate);
        while (curr <= end) {
            const dStr = curr.toISOString().slice(0, 10);
            const d = curr.getDate();
            const m = curr.getMonth() + 1;
            dateMap[dStr] = {
                date: dStr,
                label: `${d}/${m}`,
                sales: 0,
                paid: 0
            };
            curr.setDate(curr.getDate() + 1);
        }

        for (const inv of invoices) {
            if (dateMap[inv.invoice_date]) {
                dateMap[inv.invoice_date].sales += parseFloat(inv.grand_total) || 0;
            }
        }

        for (const pay of payments) {
            if (dateMap[pay.payment_date]) {
                dateMap[pay.payment_date].paid += parseFloat(pay.amount) || 0;
            }
        }

        return Object.values(dateMap);
    }
}

export default DashboardRepository;
