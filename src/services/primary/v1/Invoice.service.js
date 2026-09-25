import { InvoiceRepository, DeliveryRepository, SalesOrderRepository, CustomerRepository, ProductRepository } from "#repositoriesPrimaryV1";

class InvoiceService {
    constructor(server) {
        this.server = server;
        this.invoiceRepo = new InvoiceRepository(this.server);
        this.deliveryRepo = new DeliveryRepository(this.server);
        this.salesOrderRepo = new SalesOrderRepository(this.server);
        this.customerRepo = new CustomerRepository(this.server);
        this.productRepo = new ProductRepository(this.server);
    }

    async generateInvoiceNumber(date = new Date()) {
        const d = new Date(date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const prefix = `INV-${yyyy}${mm}-`;

        const latest = await this.invoiceRepo.invoiceTable.findOne({
            where: {
                invoice_number: {
                    [this.server.model.db.Sequelize.Op.like]: `${prefix}%`
                }
            },
            order: [['id', 'DESC']]
        });

        if (!latest) {
            return `${prefix}001`;
        }

        const parts = latest.invoice_number.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10) || 0;
        const nextSeq = String(lastSeq + 1).padStart(3, '0');
        return `${prefix}${nextSeq}`;
    }

    async getInvoices(query = {}) {
        const page = parseInt(query.page || 1, 10);
        const limit = parseInt(query.limit || 10, 10);

        const result = await this.invoiceRepo.findInvoices(query);
        const total = result.count;
        const totalPages = Math.ceil(total / limit) || 1;
        const todayStr = new Date().toISOString().slice(0, 10);

        const items = result.rows.map(inv => {
            const grandTotal = parseFloat(inv.grand_total) || 0;
            const paidAmount = parseFloat(inv.paid_amount) || 0;
            const remainingAmount = Math.max(0, grandTotal - paidAmount);

            let status = inv.status;
            if (status !== 'Lunas' && status !== 'Dibatalkan' && inv.due_date && inv.due_date < todayStr) {
                status = 'Jatuh Tempo';
            }

            return {
                id: inv.id,
                invoiceNo: inv.invoice_number,
                refDelivery: inv.delivery?.delivery_number || '-',
                delivery_id: inv.delivery_id,
                refOrder: inv.salesOrder?.sales_order_number || '-',
                sales_order_id: inv.sales_order_id,
                customer_id: inv.customer_id,
                customerName: inv.customer?.name || '-',
                customerPhone: inv.customer?.phone || '-',
                customerAddress: inv.customer?.address || '-',
                issueDate: inv.invoice_date,
                dueDate: inv.due_date,
                subtotal: parseFloat(inv.subtotal) || 0,
                discount_amount: parseFloat(inv.discount_amount) || 0,
                tax_amount: parseFloat(inv.tax_amount) || 0,
                totalAmount: grandTotal,
                paidAmount: paidAmount,
                remainingAmount: remainingAmount,
                status: status,
                notes: inv.notes || '',
                creator: inv.creator?.name || '-',
                items: inv.items ? inv.items.map(item => ({
                    id: item.id,
                    product_id: item.product_id,
                    delivery_id: item.delivery_id,
                    productCode: item.product?.code || '-',
                    productName: item.product?.name || '-',
                    quantity: parseFloat(item.quantity) || 0,
                    unit_price: parseFloat(item.unit_price) || 0,
                    discount_amount: parseFloat(item.discount_amount) || 0,
                    tax_amount: parseFloat(item.tax_amount) || 0,
                    subtotal: parseFloat(item.subtotal) || 0,
                    total: parseFloat(item.total) || 0
                })) : [],
                created_at: inv.created_at,
                updated_at: inv.updated_at
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

    async getInvoiceMetrics() {
        return await this.invoiceRepo.getInvoiceMetrics();
    }

    async getInvoiceById(id) {
        const inv = await this.invoiceRepo.findInvoiceById(id);
        if (!inv) return null;

        const grandTotal = parseFloat(inv.grand_total) || 0;
        const paidAmount = parseFloat(inv.paid_amount) || 0;
        const remainingAmount = Math.max(0, grandTotal - paidAmount);
        const todayStr = new Date().toISOString().slice(0, 10);

        let status = inv.status;
        if (status !== 'Lunas' && status !== 'Dibatalkan' && inv.due_date && inv.due_date < todayStr) {
            status = 'Jatuh Tempo';
        }

        return {
            id: inv.id,
            invoiceNo: inv.invoice_number,
            refDelivery: inv.delivery?.delivery_number || '-',
            delivery_id: inv.delivery_id,
            delivery: inv.delivery,
            refOrder: inv.salesOrder?.sales_order_number || '-',
            sales_order_id: inv.sales_order_id,
            salesOrder: inv.salesOrder,
            customer_id: inv.customer_id,
            customerName: inv.customer?.name || '-',
            customer: inv.customer,
            issueDate: inv.invoice_date,
            dueDate: inv.due_date,
            subtotal: parseFloat(inv.subtotal) || 0,
            discount_amount: parseFloat(inv.discount_amount) || 0,
            tax_amount: parseFloat(inv.tax_amount) || 0,
            totalAmount: grandTotal,
            paidAmount: paidAmount,
            remainingAmount: remainingAmount,
            status: status,
            notes: inv.notes || '',
            creator: inv.creator?.name || '-',
            items: inv.items ? inv.items.map(item => ({
                id: item.id,
                product_id: item.product_id,
                delivery_id: item.delivery_id,
                productCode: item.product?.code || '-',
                productName: item.product?.name || '-',
                product: item.product,
                quantity: parseFloat(item.quantity) || 0,
                unit_price: parseFloat(item.unit_price) || 0,
                discount_amount: parseFloat(item.discount_amount) || 0,
                tax_amount: parseFloat(item.tax_amount) || 0,
                subtotal: parseFloat(item.subtotal) || 0,
                total: parseFloat(item.total) || 0
            })) : [],
            created_at: inv.created_at,
            updated_at: inv.updated_at
        };
    }

    async createInvoice(data, user = null) {
        return await this.server.model.db.transaction(async (t) => {
            let customer_id = data.customer_id;
            let sales_order_id = data.sales_order_id || null;
            let delivery_id = data.delivery_id || null;

            // If delivery_id provided, load delivery
            let delivery = null;
            if (delivery_id) {
                delivery = await this.deliveryRepo.findDeliveryById(delivery_id, t);
                if (!delivery) return -1; // Delivery not found
                customer_id = delivery.customer_id;
                sales_order_id = delivery.sales_order_id;
            } else if (sales_order_id) {
                const so = await this.salesOrderRepo.findSalesOrderById(sales_order_id, t);
                if (!so) return -2; // Sales Order not found
                customer_id = so.customer_id;
            }

            if (!customer_id) {
                return -3; // Customer ID required
            }

            const paymentTermsDays = 30;

            const invoice_date = data.invoice_date || new Date().toISOString().slice(0, 10);
            let due_date = data.due_date;
            if (!due_date) {
                const invDateObj = new Date(invoice_date);
                invDateObj.setDate(invDateObj.getDate() + paymentTermsDays);
                due_date = invDateObj.toISOString().slice(0, 10);
            }

            const invoice_number = data.invoice_number || await this.generateInvoiceNumber(invoice_date);

            // Determine items
            let itemsToProcess = data.items || [];
            if (itemsToProcess.length === 0 && delivery && delivery.items) {
                // Auto populate from delivery
                // Get selling prices from Sales Order items if available
                const soItemPriceMap = {};
                if (delivery.salesOrder?.items) {
                    delivery.salesOrder.items.forEach(soItem => {
                        soItemPriceMap[soItem.product_id] = parseFloat(soItem.unit_price) || 0;
                    });
                }

                itemsToProcess = delivery.items.map(dItem => ({
                    product_id: dItem.product_id,
                    delivery_id: delivery.id,
                    quantity: parseFloat(dItem.quantity) || 0,
                    unit_price: soItemPriceMap[dItem.product_id] || (parseFloat(dItem.product?.selling_price) || 0),
                    discount_amount: 0,
                    tax_amount: 0
                }));
            }

            if (itemsToProcess.length === 0) {
                return -4; // No items to invoice
            }

            let calculatedSubtotal = 0;
            const preparedItems = [];

            for (const item of itemsToProcess) {
                const qty = parseFloat(item.quantity) || 0;
                if (qty <= 0) continue;

                let unit_price = parseFloat(item.unit_price);
                if (isNaN(unit_price) || unit_price <= 0) {
                    const prod = await this.server.model.products.table.findByPk(item.product_id, { transaction: t });
                    unit_price = prod ? parseFloat(prod.selling_price) || 0 : 0;
                }

                const discount = parseFloat(item.discount_amount) || 0;
                const tax = parseFloat(item.tax_amount) || 0;
                const itemSubtotal = qty * unit_price;
                const itemTotal = itemSubtotal - discount + tax;

                calculatedSubtotal += itemSubtotal;

                preparedItems.push({
                    product_id: item.product_id,
                    delivery_id: item.delivery_id || delivery_id || null,
                    quantity: qty,
                    unit_price,
                    discount_amount: discount,
                    tax_amount: tax,
                    subtotal: itemSubtotal,
                    total: itemTotal
                });
            }

            if (preparedItems.length === 0) {
                return -4;
            }

            const discount_amount = parseFloat(data.discount_amount) || 0;
            const tax_amount = parseFloat(data.tax_amount) || 0;
            const grand_total = calculatedSubtotal - discount_amount + tax_amount;

            const invoice = await this.invoiceRepo.createInvoice({
                invoice_number,
                customer_id,
                delivery_id,
                sales_order_id,
                invoice_date,
                due_date,
                subtotal: calculatedSubtotal,
                discount_amount,
                tax_amount,
                grand_total,
                paid_amount: 0,
                status: data.status || 'Belum Dibayar',
                notes: data.notes || null,
                created_by: user?.id || null
            }, t);

            const itemsWithInvoiceId = preparedItems.map(it => ({
                ...it,
                invoice_id: invoice.id
            }));
            await this.invoiceRepo.createInvoiceItems(itemsWithInvoiceId, t);

            return await this.invoiceRepo.findInvoiceById(invoice.id, t);
        });
    }

    async updateInvoice(id, data) {
        const invoice = await this.invoiceRepo.findInvoiceById(id);
        if (!invoice) return null;

        const updateData = {};
        if (data.status) updateData.status = data.status;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.due_date) updateData.due_date = data.due_date;
        if (data.paid_amount !== undefined) {
            updateData.paid_amount = data.paid_amount;
            const grandTotal = parseFloat(invoice.grand_total) || 0;
            if (updateData.paid_amount >= grandTotal) {
                updateData.status = 'Lunas';
            } else if (updateData.paid_amount > 0) {
                updateData.status = 'Sebagian';
            }
        }

        return await this.invoiceRepo.updateInvoice(id, updateData);
    }

    async deleteInvoice(id) {
        return await this.invoiceRepo.deleteInvoice(id);
    }

    async batchDeleteInvoices(ids) {
        return await this.invoiceRepo.batchDeleteInvoices(ids);
    }
}

export default InvoiceService;
