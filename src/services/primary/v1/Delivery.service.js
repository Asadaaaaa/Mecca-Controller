import { DeliveryRepository, SalesOrderRepository, InventoryRepository, CustomerRepository, WarehouseRepository, ProductRepository } from "#repositoriesPrimaryV1";

class DeliveryService {
    constructor(server) {
        this.server = server;
        this.deliveryRepo = new DeliveryRepository(this.server);
        this.salesOrderRepo = new SalesOrderRepository(this.server);
        this.inventoryRepo = new InventoryRepository(this.server);
        this.customerRepo = new CustomerRepository(this.server);
        this.warehouseRepo = new WarehouseRepository(this.server);
        this.productRepo = new ProductRepository(this.server);
    }

    async generateDeliveryNumber(date = new Date()) {
        const d = new Date(date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const prefix = `DO-${yyyy}${mm}-`;

        const latest = await this.deliveryRepo.deliveryTable.findOne({
            where: {
                delivery_number: {
                    [this.server.model.db.Sequelize.Op.like]: `${prefix}%`
                }
            },
            order: [['id', 'DESC']]
        });

        if (!latest) {
            return `${prefix}001`;
        }

        const parts = latest.delivery_number.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10) || 0;
        const nextSeq = String(lastSeq + 1).padStart(3, '0');
        return `${prefix}${nextSeq}`;
    }

    async getDeliveries(query = {}) {
        const page = parseInt(query.page || 1, 10);
        const limit = parseInt(query.limit || 10, 10);

        const result = await this.deliveryRepo.findDeliveries(query);
        const total = result.count;
        const totalPages = Math.ceil(total / limit) || 1;

        const items = result.rows.map(d => {
            const totalItems = d.items ? d.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0) : 0;

            return {
                id: d.id,
                deliveryNo: d.delivery_number,
                refOrder: d.salesOrder?.sales_order_number || '-',
                sales_order_id: d.sales_order_id,
                date: d.delivery_date,
                customer_id: d.customer_id,
                customerName: d.customer?.name || '-',
                warehouse_id: d.warehouse_id,
                warehouse: d.warehouse?.name || '-',
                courierFleet: d.courier_fleet || '-',
                trackingNumber: d.tracking_number || '-',
                totalItems,
                status: d.status,
                notes: d.notes || '',
                creator: d.creator?.name || '-',
                items: d.items ? d.items.map(item => ({
                    id: item.id,
                    sales_order_item_id: item.sales_order_item_id,
                    product_id: item.product_id,
                    productCode: item.product?.code || '-',
                    productName: item.product?.name || '-',
                    quantity: parseFloat(item.quantity) || 0
                })) : [],
                created_at: d.created_at,
                updated_at: d.updated_at
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

    async getDeliveryMetrics() {
        return await this.deliveryRepo.getDeliveryMetrics();
    }

    async getDeliveryById(id) {
        const d = await this.deliveryRepo.findDeliveryById(id);
        if (!d) return null;

        const totalItems = d.items ? d.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0) : 0;

        return {
            id: d.id,
            deliveryNo: d.delivery_number,
            refOrder: d.salesOrder?.sales_order_number || '-',
            sales_order_id: d.sales_order_id,
            salesOrder: d.salesOrder,
            date: d.delivery_date,
            customer_id: d.customer_id,
            customerName: d.customer?.name || '-',
            customer: d.customer,
            warehouse_id: d.warehouse_id,
            warehouse: d.warehouse?.name || '-',
            warehouseDetail: d.warehouse,
            courierFleet: d.courier_fleet,
            trackingNumber: d.tracking_number,
            totalItems,
            status: d.status,
            notes: d.notes,
            creator: d.creator,
            items: d.items ? d.items.map(item => ({
                id: item.id,
                sales_order_item_id: item.sales_order_item_id,
                product_id: item.product_id,
                product: item.product,
                quantity: parseFloat(item.quantity) || 0,
                so_quantity: item.salesOrderItem ? parseFloat(item.salesOrderItem.quantity) : 0,
                so_delivered_quantity: item.salesOrderItem ? parseFloat(item.salesOrderItem.delivered_quantity) : 0
            })) : []
        };
    }

    async createDelivery(data, user = null) {
        return await this.server.model.db.transaction(async (t) => {
            const salesOrder = await this.salesOrderRepo.findSalesOrderById(data.sales_order_id, t);
            if (!salesOrder) return -1; // Sales Order not found

            const warehouse_id = data.warehouse_id || salesOrder.warehouse_id || 1;
            const customer_id = salesOrder.customer_id;
            const delivery_number = data.delivery_number || await this.generateDeliveryNumber(data.delivery_date || new Date());

            // Validate item quantities against SO remaining quantities
            const soItemMap = {};
            if (salesOrder.items) {
                salesOrder.items.forEach(soItem => {
                    soItemMap[soItem.id] = {
                        ordered: parseFloat(soItem.quantity) || 0,
                        delivered: parseFloat(soItem.delivered_quantity) || 0,
                        product_id: soItem.product_id
                    };
                });
            }

            const itemsToCreate = [];
            for (const item of (data.items || [])) {
                const soItemId = item.sales_order_item_id;
                const qty = parseFloat(item.quantity) || 0;
                if (qty <= 0) continue;

                const productId = soItemMap[soItemId]?.product_id || item.product_id;

                if (soItemMap[soItemId]) {
                    const remaining = soItemMap[soItemId].ordered - soItemMap[soItemId].delivered;
                    if (qty > remaining) {
                        return -2; // Quantity exceeds remaining SO quantity
                    }
                }

                // Strict restriction: Check available physical stock in warehouse
                if (productId) {
                    const stock = await this.inventoryRepo.findStockByWarehouseAndProduct(warehouse_id, productId, t);
                    const currentPhysical = stock ? parseFloat(stock.quantity) : 0;
                    if (qty > currentPhysical) {
                        const product = await this.server.model.products?.table.findByPk(productId, { transaction: t });
                        const prodName = product ? product.name : `Produk ID ${productId}`;
                        return {
                            error: 'INSUFFICIENT_PHYSICAL_STOCK',
                            message: `Stok fisik di gudang tidak mencukupi untuk "${prodName}". Stok fisik saat ini: ${currentPhysical}, diminta kirim: ${qty}. Pengiriman tidak dapat dilakukan untuk mencegah stok minus.`,
                            product_id: productId,
                            product_name: prodName,
                            available_physical: currentPhysical,
                            requested: qty
                        };
                    }
                }

                itemsToCreate.push({
                    sales_order_item_id: soItemId || null,
                    product_id: productId,
                    quantity: qty
                });
            }

            if (itemsToCreate.length === 0) {
                return -4; // No valid items
            }

            const delivery = await this.deliveryRepo.createDelivery({
                delivery_number,
                sales_order_id: salesOrder.id,
                warehouse_id,
                customer_id,
                delivery_date: data.delivery_date || new Date().toISOString().slice(0, 10),
                courier_fleet: data.courier_fleet || null,
                tracking_number: data.tracking_number || null,
                status: data.status || 'Siap Muat',
                notes: data.notes || null,
                created_by: user?.id || null
            }, t);

            const preparedItems = itemsToCreate.map(item => ({
                ...item,
                delivery_id: delivery.id
            }));
            await this.deliveryRepo.createDeliveryItems(preparedItems, t);

            return await this.deliveryRepo.findDeliveryById(delivery.id, t);
        });
    }

    async confirmDelivery(id, user = null) {
        return await this.server.model.db.transaction(async (t) => {
            const delivery = await this.deliveryRepo.findDeliveryById(id, t);
            if (!delivery) return -1; // Not found

            if (delivery.status === 'Dalam Perjalanan' || delivery.status === 'Diterima') {
                return -2; // Already confirmed or delivered
            }

            const warehouse_id = delivery.warehouse_id;

            // 1. Check stock availability for all items
            for (const item of (delivery.items || [])) {
                const stock = await this.inventoryRepo.findStockByWarehouseAndProduct(warehouse_id, item.product_id, t);
                const currentQty = stock ? parseFloat(stock.quantity) : 0;
                const reqQty = parseFloat(item.quantity);

                if (currentQty < reqQty) {
                    return {
                        error: 'INSUFFICIENT_STOCK',
                        product_id: item.product_id,
                        product_name: item.product?.name,
                        available: currentQty,
                        requested: reqQty
                    };
                }
            }

            // 2. Deduct stock & create stock_movements
            for (const item of (delivery.items || [])) {
                const stock = await this.inventoryRepo.findStockByWarehouseAndProduct(warehouse_id, item.product_id, t);
                const stock_before = stock ? parseFloat(stock.quantity) : 0;
                const quantity = parseFloat(item.quantity);
                const stock_after = stock_before - quantity;

                // Update warehouse stock
                await stock.update({ quantity: stock_after }, { transaction: t });

                // Create stock movement
                await this.inventoryRepo.createMovement({
                    warehouse_id,
                    product_id: item.product_id,
                    type: 'SALES_DELIVERY',
                    quantity,
                    stock_before,
                    stock_after,
                    reference_type: 'deliveries',
                    reference_id: delivery.id,
                    notes: `Pengiriman Penjualan DO: ${delivery.delivery_number} (Ref SO: ${delivery.salesOrder?.sales_order_number || '-'})`,
                    created_by: user?.id || null
                }, t);

                // Update SO Item delivered_quantity
                if (item.salesOrderItem) {
                    const currentDelivered = parseFloat(item.salesOrderItem.delivered_quantity) || 0;
                    await item.salesOrderItem.update({
                        delivered_quantity: currentDelivered + quantity
                    }, { transaction: t });
                }
            }

            // 3. Update Delivery status to 'Dalam Perjalanan'
            await delivery.update({ status: 'Dalam Perjalanan' }, { transaction: t });

            // 4. Update Sales Order status
            if (delivery.sales_order_id) {
                const freshSO = await this.salesOrderRepo.findSalesOrderById(delivery.sales_order_id, t);
                if (freshSO && freshSO.items) {
                    let allDelivered = true;
                    let anyDelivered = false;

                    for (const soItem of freshSO.items) {
                        const ord = parseFloat(soItem.quantity) || 0;
                        const del = parseFloat(soItem.delivered_quantity) || 0;
                        if (del < ord) {
                            allDelivered = false;
                        }
                        if (del > 0) {
                            anyDelivered = true;
                        }
                    }

                    let newSoStatus = 'Siap Kirim';
                    if (allDelivered) {
                        newSoStatus = 'Selesai Dikirim';
                    } else if (anyDelivered) {
                        newSoStatus = 'Proses Kirim';
                    }

                    await freshSO.update({ status: newSoStatus }, { transaction: t });
                }
            }

            return await this.deliveryRepo.findDeliveryById(delivery.id, t);
        });
    }

    async completeDelivery(id, user = null) {
        const delivery = await this.deliveryRepo.findDeliveryById(id);
        if (!delivery) return null;
        await delivery.update({ status: 'Diterima' });
        return delivery;
    }

    async deleteDelivery(id) {
        return await this.deliveryRepo.deleteDelivery(id);
    }

    async batchDeleteDeliveries(ids) {
        return await this.deliveryRepo.batchDeleteDeliveries(ids);
    }
}

export default DeliveryService;
