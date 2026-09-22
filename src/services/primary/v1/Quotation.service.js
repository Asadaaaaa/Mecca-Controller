import { QuotationRepository, SalesOrderRepository, CustomerRepository, ProductRepository } from "#repositoriesPrimaryV1";

class QuotationService {
    constructor(server) {
        this.server = server;
        this.quotationRepo = new QuotationRepository(this.server);
        this.salesOrderRepo = new SalesOrderRepository(this.server);
        this.customerRepo = new CustomerRepository(this.server);
        this.productRepo = new ProductRepository(this.server);
    }

    async generateQuotationNumber(date = new Date()) {
        const d = new Date(date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const prefix = `QT-${yyyy}${mm}-`;

        const latest = await this.quotationRepo.quotationTable.findOne({
            where: {
                quotation_number: {
                    [this.server.model.db.Sequelize.Op.like]: `${prefix}%`
                }
            },
            order: [['id', 'DESC']]
        });

        if (!latest) {
            return `${prefix}001`;
        }

        const parts = latest.quotation_number.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10) || 0;
        const nextSeq = String(lastSeq + 1).padStart(3, '0');
        return `${prefix}${nextSeq}`;
    }

    async getQuotations(query = {}) {
        const page = parseInt(query.page || 1, 10);
        const limit = parseInt(query.limit || 10, 10);

        const result = await this.quotationRepo.findQuotations(query);
        const total = result.count;
        const totalPages = Math.ceil(total / limit) || 1;

        const items = result.rows.map(q => {
            const totalItems = q.items ? q.items.length : 0;
            const totalQty = q.items ? q.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0) : 0;

            return {
                id: q.id,
                quotationNo: q.quotation_number,
                customer_id: q.customer_id,
                customerName: q.customer?.name || '-',
                customerPhone: q.customer?.phone || '-',
                customerAddress: q.customer?.address || '-',
                date: q.quotation_date,
                validUntil: q.valid_until,
                subtotal: parseFloat(q.subtotal) || 0,
                discount_amount: parseFloat(q.discount_amount) || 0,
                tax_amount: parseFloat(q.tax_amount) || 0,
                totalAmount: parseFloat(q.grand_total) || 0,
                totalItems,
                totalQty,
                status: q.status,
                notes: q.notes || '',
                creator: q.creator?.name || '-',
                items: q.items ? q.items.map(item => ({
                    id: item.id,
                    product_id: item.product_id,
                    productCode: item.product?.code || '-',
                    productName: item.product?.name || '-',
                    quantity: parseFloat(item.quantity) || 0,
                    unit_price: parseFloat(item.unit_price) || 0,
                    discount_amount: parseFloat(item.discount_amount) || 0,
                    tax_amount: parseFloat(item.tax_amount) || 0,
                    subtotal: parseFloat(item.subtotal) || 0,
                    total: parseFloat(item.total) || 0
                })) : [],
                created_at: q.created_at,
                updated_at: q.updated_at
            };
        });

        return {
            items,
            pagination: {
                total,
                page,
                limit,
                totalPages
            }
        };
    }

    async getQuotationMetrics() {
        return await this.quotationRepo.getQuotationMetrics();
    }

    async getQuotationById(id) {
        const q = await this.quotationRepo.findQuotationById(id);
        if (!q) return null;

        return {
            id: q.id,
            quotationNo: q.quotation_number,
            customer_id: q.customer_id,
            customer: q.customer,
            date: q.quotation_date,
            validUntil: q.valid_until,
            subtotal: parseFloat(q.subtotal) || 0,
            discount_amount: parseFloat(q.discount_amount) || 0,
            tax_amount: parseFloat(q.tax_amount) || 0,
            grand_total: parseFloat(q.grand_total) || 0,
            status: q.status,
            notes: q.notes,
            creator: q.creator,
            items: q.items ? q.items.map(item => ({
                id: item.id,
                product_id: item.product_id,
                product: item.product,
                quantity: parseFloat(item.quantity) || 0,
                unit_price: parseFloat(item.unit_price) || 0,
                discount_amount: parseFloat(item.discount_amount) || 0,
                tax_amount: parseFloat(item.tax_amount) || 0,
                subtotal: parseFloat(item.subtotal) || 0,
                total: parseFloat(item.total) || 0
            })) : []
        };
    }

    async createQuotation(data, user = null) {
        return await this.server.model.db.transaction(async (t) => {
            const quotation_number = data.quotation_number || await this.generateQuotationNumber(data.quotation_date || new Date());

            let calculatedSubtotal = 0;
            let calculatedTotal = 0;

            const itemsToCreate = (data.items || []).map(item => {
                const qty = parseFloat(item.quantity) || 1;
                const price = parseFloat(item.unit_price) || 0;
                const disc = parseFloat(item.discount_amount) || 0;
                const tax = parseFloat(item.tax_amount) || 0;
                const itemSubtotal = qty * price;
                const itemTotal = itemSubtotal - disc + tax;

                calculatedSubtotal += itemSubtotal;
                calculatedTotal += itemTotal;

                return {
                    product_id: item.product_id,
                    quantity: qty,
                    unit_price: price,
                    discount_amount: disc,
                    tax_amount: tax,
                    subtotal: itemSubtotal,
                    total: itemTotal
                };
            });

            const subtotal = data.subtotal !== undefined ? parseFloat(data.subtotal) : calculatedSubtotal;
            const discount_amount = parseFloat(data.discount_amount) || 0;
            const tax_amount = parseFloat(data.tax_amount) || 0;
            const grand_total = data.grand_total !== undefined ? parseFloat(data.grand_total) : (subtotal - discount_amount + tax_amount);

            const quotation = await this.quotationRepo.createQuotation({
                quotation_number,
                customer_id: data.customer_id,
                quotation_date: data.quotation_date || new Date().toISOString().slice(0, 10),
                valid_until: data.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                subtotal,
                discount_amount,
                tax_amount,
                grand_total,
                status: data.status || 'Draf',
                notes: data.notes || null,
                created_by: user?.id || null
            }, t);

            if (itemsToCreate.length > 0) {
                const preparedItems = itemsToCreate.map(item => ({
                    ...item,
                    quotation_id: quotation.id
                }));
                await this.quotationRepo.createQuotationItems(preparedItems, t);
            }

            return await this.quotationRepo.findQuotationById(quotation.id, t);
        });
    }

    async updateQuotation(id, data) {
        return await this.server.model.db.transaction(async (t) => {
            const quotation = await this.quotationRepo.findQuotationById(id, t);
            if (!quotation) return null;

            if (data.items && Array.isArray(data.items)) {
                await this.quotationRepo.deleteQuotationItems(id, t);

                let calculatedSubtotal = 0;
                let calculatedTotal = 0;

                const itemsToCreate = data.items.map(item => {
                    const qty = parseFloat(item.quantity) || 1;
                    const price = parseFloat(item.unit_price) || 0;
                    const disc = parseFloat(item.discount_amount) || 0;
                    const tax = parseFloat(item.tax_amount) || 0;
                    const itemSubtotal = qty * price;
                    const itemTotal = itemSubtotal - disc + tax;

                    calculatedSubtotal += itemSubtotal;
                    calculatedTotal += itemTotal;

                    return {
                        quotation_id: id,
                        product_id: item.product_id,
                        quantity: qty,
                        unit_price: price,
                        discount_amount: disc,
                        tax_amount: tax,
                        subtotal: itemSubtotal,
                        total: itemTotal
                    };
                });

                await this.quotationRepo.createQuotationItems(itemsToCreate, t);

                data.subtotal = data.subtotal !== undefined ? parseFloat(data.subtotal) : calculatedSubtotal;
                const discount_amount = parseFloat(data.discount_amount) || 0;
                const tax_amount = parseFloat(data.tax_amount) || 0;
                data.grand_total = data.grand_total !== undefined ? parseFloat(data.grand_total) : (data.subtotal - discount_amount + tax_amount);
            }

            await this.quotationRepo.updateQuotation(id, data, t);
            return await this.quotationRepo.findQuotationById(id, t);
        });
    }

    async approveQuotation(id, user = null) {
        const quotation = await this.quotationRepo.findQuotationById(id);
        if (!quotation) return null;
        await quotation.update({ status: 'Disetujui' });
        return quotation;
    }

    async rejectQuotation(id, user = null) {
        const quotation = await this.quotationRepo.findQuotationById(id);
        if (!quotation) return null;
        await quotation.update({ status: 'Ditolak' });
        return quotation;
    }

    async convertToSalesOrder(id, user = null) {
        return await this.server.model.db.transaction(async (t) => {
            const quotation = await this.quotationRepo.findQuotationById(id, t);
            if (!quotation) return null;

            // Generate SO number
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const prefix = `SO-${yyyy}${mm}-`;

            const latest = await this.salesOrderRepo.salesOrderTable.findOne({
                where: {
                    sales_order_number: {
                        [this.server.model.db.Sequelize.Op.like]: `${prefix}%`
                    }
                },
                order: [['id', 'DESC']],
                transaction: t
            });

            let nextSeq = '001';
            if (latest) {
                const parts = latest.sales_order_number.split('-');
                const lastSeq = parseInt(parts[parts.length - 1], 10) || 0;
                nextSeq = String(lastSeq + 1).padStart(3, '0');
            }
            const sales_order_number = `${prefix}${nextSeq}`;

            // Create Sales Order
            const salesOrder = await this.salesOrderRepo.createSalesOrder({
                sales_order_number,
                customer_id: quotation.customer_id,
                quotation_id: quotation.id,
                warehouse_id: 1, // Default warehouse utama
                order_date: now.toISOString().slice(0, 10),
                subtotal: quotation.subtotal,
                discount_amount: quotation.discount_amount,
                tax_amount: quotation.tax_amount,
                grand_total: quotation.grand_total,
                status: 'Siap Kirim',
                notes: `Dikonversi dari Penawaran: ${quotation.quotation_number}`,
                created_by: user?.id || null
            }, t);

            // Copy items to Sales Order Items
            if (quotation.items && quotation.items.length > 0) {
                const soItems = quotation.items.map(item => ({
                    sales_order_id: salesOrder.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    delivered_quantity: 0,
                    unit_price: item.unit_price,
                    discount_amount: item.discount_amount,
                    tax_amount: item.tax_amount,
                    subtotal: item.subtotal,
                    total: item.total
                }));
                await this.salesOrderRepo.createSalesOrderItems(soItems, t);
            }

            // Update quotation status
            await quotation.update({ status: 'Disetujui' }, { transaction: t });

            return await this.salesOrderRepo.findSalesOrderById(salesOrder.id, t);
        });
    }

    async deleteQuotation(id) {
        return await this.quotationRepo.deleteQuotation(id);
    }

    async batchDeleteQuotations(ids) {
        return await this.quotationRepo.batchDeleteQuotations(ids);
    }
}

export default QuotationService;
