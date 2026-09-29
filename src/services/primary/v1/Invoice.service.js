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

            const doNumbers = inv.deliveries && inv.deliveries.length > 0
                ? inv.deliveries.map(d => d.delivery_number).join(', ')
                : (inv.delivery?.delivery_number || '-');

            return {
                id: inv.id,
                invoiceNo: inv.invoice_number,
                refDelivery: doNumbers,
                delivery_id: inv.delivery_id,
                deliveries: inv.deliveries || (inv.delivery ? [inv.delivery] : []),
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
                    delivery_number: item.delivery?.delivery_number || '-',
                    sales_order_id: item.sales_order_id,
                    sales_order_number: item.salesOrder?.sales_order_number || '-',
                    sales_order_item_id: item.sales_order_item_id,
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

        const doNumbers = inv.deliveries && inv.deliveries.length > 0
            ? inv.deliveries.map(d => d.delivery_number).join(', ')
            : (inv.delivery?.delivery_number || '-');

        return {
            id: inv.id,
            invoiceNo: inv.invoice_number,
            refDelivery: doNumbers,
            delivery_id: inv.delivery_id,
            deliveries: inv.deliveries || (inv.delivery ? [inv.delivery] : []),
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
                delivery_number: item.delivery?.delivery_number || '-',
                sales_order_id: item.sales_order_id,
                sales_order_number: item.salesOrder?.sales_order_number || '-',
                sales_order_item_id: item.sales_order_item_id,
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
            const doIds = Array.isArray(data.delivery_ids) && data.delivery_ids.length > 0
                ? data.delivery_ids.map(Number)
                : (data.delivery_id ? [parseInt(data.delivery_id, 10)] : []);

            let customer_id = data.customer_id;
            let sales_order_id = data.sales_order_id || null;
            let delivery_id = doIds.length > 0 ? doIds[0] : null;

            const deliveries = [];
            for (const doId of doIds) {
                const del = await this.deliveryRepo.findDeliveryById(doId, t);
                if (!del) return -1; // Delivery not found
                deliveries.push(del);
            }

            if (deliveries.length > 0) {
                const firstCustId = deliveries[0].customer_id;
                const mismatchedCust = deliveries.some(d => d.customer_id !== firstCustId);
                if (mismatchedCust) {
                    return {
                        error: 'MISMATCHED_CUSTOMER',
                        message: 'Semua Surat Jalan (DO) yang digabungkan harus milik pelanggan yang sama.'
                    };
                }
                customer_id = firstCustId;
                sales_order_id = deliveries[0].sales_order_id || null;
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

            // Pre-load SO item pricing directly from sales_order_items table
            const soItemPriceMap = {};
            for (const del of deliveries) {
                if (del.items) {
                    for (const dItem of del.items) {
                        const soItemId = dItem.sales_order_item_id;
                        if (soItemId) {
                            const soItem = await this.server.model.salesOrderItems?.table.findByPk(soItemId, { transaction: t });
                            if (soItem) {
                                const price = parseFloat(soItem.unit_price) || 0;
                                const disc = parseFloat(soItem.discount_amount) || 0;
                                soItemPriceMap[`soItem_${soItemId}`] = {
                                    unit_price: price,
                                    discount_amount: disc,
                                    sales_order_id: soItem.sales_order_id,
                                    sales_order_item_id: soItem.id,
                                    product_id: soItem.product_id
                                };
                                soItemPriceMap[`delItem_${dItem.id}`] = soItemPriceMap[`soItem_${soItemId}`];
                                soItemPriceMap[`prod_${soItem.product_id}`] = soItemPriceMap[`soItem_${soItemId}`];
                            }
                        }
                    }
                }
            }

            // Also check direct sales_order_id if present
            if (sales_order_id) {
                const directSO = await this.salesOrderRepo.findSalesOrderById(sales_order_id, t);
                if (directSO && directSO.items) {
                    directSO.items.forEach(soItem => {
                        const price = parseFloat(soItem.unit_price) || 0;
                        const disc = parseFloat(soItem.discount_amount) || 0;
                        soItemPriceMap[`soItem_${soItem.id}`] = {
                            unit_price: price,
                            discount_amount: disc,
                            sales_order_id: soItem.sales_order_id,
                            sales_order_item_id: soItem.id,
                            product_id: soItem.product_id
                        };
                        soItemPriceMap[`prod_${soItem.product_id}`] = soItemPriceMap[`soItem_${soItem.id}`];
                    });
                }
            }

            // Determine items to process
            let itemsToProcess = data.items || [];
            if (itemsToProcess.length === 0 && deliveries.length > 0) {
                // Auto populate from all deliveries
                for (const del of deliveries) {
                    if (del.items) {
                        for (const dItem of del.items) {
                            const priceInfo = soItemPriceMap[`delItem_${dItem.id}`] ||
                                              soItemPriceMap[`soItem_${dItem.sales_order_item_id}`] ||
                                              soItemPriceMap[`prod_${dItem.product_id}`];
                            const unit_price = priceInfo ? priceInfo.unit_price : (parseFloat(dItem.product?.selling_price) || 0);

                            itemsToProcess.push({
                                product_id: dItem.product_id,
                                delivery_id: del.id,
                                delivery_item_id: dItem.id,
                                sales_order_id: dItem.sales_order_id || priceInfo?.sales_order_id || del.sales_order_id || null,
                                sales_order_item_id: dItem.sales_order_item_id || priceInfo?.sales_order_item_id || null,
                                quantity: parseFloat(dItem.quantity) || 0,
                                unit_price: unit_price,
                                discount_amount: 0,
                                tax_amount: 0
                            });
                        }
                    }
                }
            }

            if (itemsToProcess.length === 0) {
                return -4; // No items to invoice
            }

            let calculatedSubtotal = 0;
            const preparedItems = [];

            for (const item of itemsToProcess) {
                const qty = parseFloat(item.quantity) || 0;
                if (qty <= 0) continue;

                // Priority 1: unit_price specified in payload (if > 0)
                // Priority 2: unit_price from matched sales_order_items (MANDATORY per business rule)
                // Priority 3: fallback to product selling_price only if no order item exists
                const priceInfo = (item.delivery_item_id ? soItemPriceMap[`delItem_${item.delivery_item_id}`] : null) ||
                                  (item.sales_order_item_id ? soItemPriceMap[`soItem_${item.sales_order_item_id}`] : null) ||
                                  soItemPriceMap[`prod_${item.product_id}`];

                let unit_price = parseFloat(item.unit_price);
                if (isNaN(unit_price) || unit_price <= 0) {
                    if (priceInfo && priceInfo.unit_price > 0) {
                        unit_price = priceInfo.unit_price;
                    } else {
                        const prod = await this.server.model.products.table.findByPk(item.product_id, { transaction: t });
                        unit_price = prod ? parseFloat(prod.selling_price) || 0 : 0;
                    }
                }

                const discount = parseFloat(item.discount_amount) || 0;
                const tax = parseFloat(item.tax_amount) || 0;
                const itemSubtotal = qty * unit_price;
                const itemTotal = itemSubtotal - discount + tax;

                calculatedSubtotal += itemSubtotal;

                preparedItems.push({
                    product_id: item.product_id,
                    delivery_id: item.delivery_id || delivery_id || null,
                    delivery_item_id: item.delivery_item_id || null,
                    sales_order_id: item.sales_order_id || priceInfo?.sales_order_id || sales_order_id || null,
                    sales_order_item_id: item.sales_order_item_id || priceInfo?.sales_order_item_id || null,
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
                delivery_id: doIds.length === 1 ? doIds[0] : null,
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

            // Record in invoice_deliveries junction table
            if (doIds.length > 0) {
                const junctionEntries = doIds.map(doId => ({
                    invoice_id: invoice.id,
                    delivery_id: doId
                }));
                await this.invoiceRepo.createInvoiceDeliveries(junctionEntries, t);
            }

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
