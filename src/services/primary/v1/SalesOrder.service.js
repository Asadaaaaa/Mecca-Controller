import { SalesOrderRepository, CustomerRepository, ProductRepository, WarehouseRepository } from "#repositoriesPrimaryV1";

class SalesOrderService {
    constructor(server) {
        this.server = server;
        this.salesOrderRepo = new SalesOrderRepository(this.server);
        this.customerRepo = new CustomerRepository(this.server);
        this.productRepo = new ProductRepository(this.server);
        this.warehouseRepo = new WarehouseRepository(this.server);
    }

    async generateSalesOrderNumber(date = new Date()) {
        const d = new Date(date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const prefix = `SO-${yyyy}${mm}-`;

        const latest = await this.salesOrderRepo.salesOrderTable.findOne({
            where: {
                sales_order_number: {
                    [this.server.model.db.Sequelize.Op.like]: `${prefix}%`
                }
            },
            order: [['id', 'DESC']]
        });

        if (!latest) {
            return `${prefix}001`;
        }

        const parts = latest.sales_order_number.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10) || 0;
        const nextSeq = String(lastSeq + 1).padStart(3, '0');
        return `${prefix}${nextSeq}`;
    }

    async getSalesOrders(query = {}) {
        const page = parseInt(query.page || 1, 10);
        const limit = parseInt(query.limit || 10, 10);

        const result = await this.salesOrderRepo.findSalesOrders(query);
        const total = result.count;
        const totalPages = Math.ceil(total / limit) || 1;

        const items = result.rows.map(o => {
            const itemsCount = o.items ? o.items.length : 0;
            const totalQty = o.items ? o.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0) : 0;
            const totalDeliveredQty = o.items ? o.items.reduce((sum, item) => sum + (parseFloat(item.delivered_quantity) || 0), 0) : 0;

            return {
                id: o.id,
                orderNo: o.sales_order_number,
                refQuotation: o.quotation?.quotation_number || '-',
                quotation_id: o.quotation_id,
                customer_id: o.customer_id,
                customerName: o.customer?.name || '-',
                warehouse_id: o.warehouse_id,
                warehouse: o.warehouse?.name || '-',
                date: o.order_date,
                subtotal: parseFloat(o.subtotal) || 0,
                discount_amount: parseFloat(o.discount_amount) || 0,
                tax_amount: parseFloat(o.tax_amount) || 0,
                totalAmount: parseFloat(o.grand_total) || 0,
                itemsCount,
                totalQty,
                totalDeliveredQty,
                status: o.status,
                notes: o.notes || '',
                creator: o.creator?.name || '-',
                items: o.items ? o.items.map(item => ({
                    id: item.id,
                    product_id: item.product_id,
                    productCode: item.product?.code || '-',
                    productName: item.product?.name || '-',
                    quantity: parseFloat(item.quantity) || 0,
                    delivered_quantity: parseFloat(item.delivered_quantity) || 0,
                    remaining_quantity: (parseFloat(item.quantity) || 0) - (parseFloat(item.delivered_quantity) || 0),
                    unit_price: parseFloat(item.unit_price) || 0,
                    discount_amount: parseFloat(item.discount_amount) || 0,
                    tax_amount: parseFloat(item.tax_amount) || 0,
                    subtotal: parseFloat(item.subtotal) || 0,
                    total: parseFloat(item.total) || 0
                })) : [],
                created_at: o.created_at,
                updated_at: o.updated_at
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

    async getSalesOrderMetrics() {
        return await this.salesOrderRepo.getSalesOrderMetrics();
    }

    async getSalesOrderById(id) {
        const o = await this.salesOrderRepo.findSalesOrderById(id);
        if (!o) return null;

        return {
            id: o.id,
            orderNo: o.sales_order_number,
            refQuotation: o.quotation?.quotation_number || '-',
            quotation_id: o.quotation_id,
            customer_id: o.customer_id,
            customer: o.customer,
            warehouse_id: o.warehouse_id,
            warehouse: o.warehouse,
            date: o.order_date,
            subtotal: parseFloat(o.subtotal) || 0,
            discount_amount: parseFloat(o.discount_amount) || 0,
            tax_amount: parseFloat(o.tax_amount) || 0,
            grand_total: parseFloat(o.grand_total) || 0,
            status: o.status,
            notes: o.notes,
            creator: o.creator,
            items: o.items ? o.items.map(item => ({
                id: item.id,
                product_id: item.product_id,
                product: item.product,
                quantity: parseFloat(item.quantity) || 0,
                delivered_quantity: parseFloat(item.delivered_quantity) || 0,
                remaining_quantity: (parseFloat(item.quantity) || 0) - (parseFloat(item.delivered_quantity) || 0),
                unit_price: parseFloat(item.unit_price) || 0,
                discount_amount: parseFloat(item.discount_amount) || 0,
                tax_amount: parseFloat(item.tax_amount) || 0,
                subtotal: parseFloat(item.subtotal) || 0,
                total: parseFloat(item.total) || 0
            })) : [],
            deliveries: o.deliveries || []
        };
    }

    async createSalesOrder(data, user = null) {
        return await this.server.model.db.transaction(async (t) => {
            const sales_order_number = data.sales_order_number || await this.generateSalesOrderNumber(data.order_date || new Date());

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
                    delivered_quantity: 0,
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

            const salesOrder = await this.salesOrderRepo.createSalesOrder({
                sales_order_number,
                customer_id: data.customer_id,
                quotation_id: data.quotation_id || null,
                warehouse_id: data.warehouse_id || 1,
                order_date: data.order_date || new Date().toISOString().slice(0, 10),
                subtotal,
                discount_amount,
                tax_amount,
                grand_total,
                status: data.status || 'Siap Kirim',
                notes: data.notes || null,
                created_by: user?.id || null
            }, t);

            if (itemsToCreate.length > 0) {
                const preparedItems = itemsToCreate.map(item => ({
                    ...item,
                    sales_order_id: salesOrder.id
                }));
                await this.salesOrderRepo.createSalesOrderItems(preparedItems, t);
            }

            return await this.salesOrderRepo.findSalesOrderById(salesOrder.id, t);
        });
    }

    async updateSalesOrder(id, data) {
        return await this.server.model.db.transaction(async (t) => {
            const salesOrder = await this.salesOrderRepo.findSalesOrderById(id, t);
            if (!salesOrder) return null;

            if (data.items && Array.isArray(data.items)) {
                await this.salesOrderRepo.salesOrderItemTable.destroy({
                    where: { sales_order_id: id },
                    transaction: t
                });

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
                        sales_order_id: id,
                        product_id: item.product_id,
                        quantity: qty,
                        delivered_quantity: parseFloat(item.delivered_quantity) || 0,
                        unit_price: price,
                        discount_amount: disc,
                        tax_amount: tax,
                        subtotal: itemSubtotal,
                        total: itemTotal
                    };
                });

                await this.salesOrderRepo.createSalesOrderItems(itemsToCreate, t);

                data.subtotal = data.subtotal !== undefined ? parseFloat(data.subtotal) : calculatedSubtotal;
                const discount_amount = parseFloat(data.discount_amount) || 0;
                const tax_amount = parseFloat(data.tax_amount) || 0;
                data.grand_total = data.grand_total !== undefined ? parseFloat(data.grand_total) : (data.subtotal - discount_amount + tax_amount);
            }

            await this.salesOrderRepo.updateSalesOrder(id, data, t);
            return await this.salesOrderRepo.findSalesOrderById(id, t);
        });
    }

    async confirmSalesOrder(id) {
        const order = await this.salesOrderRepo.findSalesOrderById(id);
        if (!order) return null;
        await order.update({ status: 'Siap Kirim' });
        return order;
    }

    async cancelSalesOrder(id) {
        const order = await this.salesOrderRepo.findSalesOrderById(id);
        if (!order) return null;
        await order.update({ status: 'Dibatalkan' });
        return order;
    }

    async deleteSalesOrder(id) {
        return await this.salesOrderRepo.deleteSalesOrder(id);
    }

    async batchDeleteSalesOrders(ids) {
        return await this.salesOrderRepo.batchDeleteSalesOrders(ids);
    }
}

export default SalesOrderService;
