import { InventoryRepository, ProductRepository, WarehouseRepository } from "#repositoriesPrimaryV1";

class InventoryService {
    constructor(server) {
        this.server = server;
        this.inventoryRepo = new InventoryRepository(this.server);
        this.productRepo = new ProductRepository(this.server);
        this.warehouseRepo = new WarehouseRepository(this.server);
    }

    // ==========================================
    // STOCKS
    // ==========================================
    async getStocks(query = {}) {
        const page = parseInt(query.page || 1, 10);
        const limit = parseInt(query.limit || 10, 10);

        const result = await this.inventoryRepo.findStocks(query);
        const total = result.count;
        const totalPages = Math.ceil(total / limit) || 1;

        const items = result.rows.map(s => {
            const actualStock = parseFloat(s.quantity) || 0;
            const minStock = parseFloat(s.min_stock) || 0;
            const unitPrice = parseFloat(s.product?.selling_price) || 0;

            let status = "Aman";
            if (actualStock <= 0) {
                status = "Habis";
            } else if (actualStock <= minStock) {
                status = "Menipis";
            }

            return {
                id: s.id,
                warehouse_id: s.warehouse_id,
                product_id: s.product_id,
                sku: s.product?.code || '-',
                name: s.product?.name || '-',
                warehouse: s.warehouse?.name || '-',
                category: s.product?.category?.name || '-',
                unit: s.product?.unit?.code || '-',
                minStock,
                actualStock,
                unitPrice,
                status,
                created_at: s.created_at,
                updated_at: s.updated_at
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

    async getStockMetrics() {
        return await this.inventoryRepo.getStockMetrics();
    }

    async stockAdjustment(data, user = null) {
        const warehouse_id = parseInt(data.warehouse_id, 10);
        const product_id = parseInt(data.product_id, 10);
        const quantity = parseFloat(data.quantity);
        const type = data.type; // STOCK_IN, ADJUSTMENT_IN, ADJUSTMENT_OUT

        return await this.server.model.db.transaction(async (t) => {
            const currentStock = await this.inventoryRepo.findStockByWarehouseAndProduct(warehouse_id, product_id, t);
            const stock_before = currentStock ? parseFloat(currentStock.quantity) : 0;

            let stock_after = stock_before;
            if (type === 'STOCK_IN' || type === 'ADJUSTMENT_IN') {
                stock_after = stock_before + quantity;
            } else if (type === 'ADJUSTMENT_OUT') {
                if (stock_before < quantity) {
                    return -3; // Insufficient stock
                }
                stock_after = stock_before - quantity;
            }

            // Update or create warehouse_stock
            let updatedStock;
            if (currentStock) {
                await currentStock.update({
                    quantity: stock_after,
                    min_stock: data.min_stock !== undefined ? parseFloat(data.min_stock) : currentStock.min_stock
                }, { transaction: t });
                updatedStock = currentStock;
            } else {
                updatedStock = await this.inventoryRepo.stockTable.create({
                    warehouse_id,
                    product_id,
                    quantity: stock_after,
                    min_stock: data.min_stock !== undefined ? parseFloat(data.min_stock) : 10
                }, { transaction: t });
            }

            // Insert stock movement
            const movement = await this.inventoryRepo.createMovement({
                warehouse_id,
                product_id,
                type,
                quantity,
                stock_before,
                stock_after,
                reference_type: 'adjustment',
                reference_id: null,
                notes: data.notes || `Penyesuaian stok manual (${type})`,
                created_by: user?.id || null
            }, t);

            return { stock: updatedStock, movement };
        });
    }

    async deleteStock(id) {
        return await this.inventoryRepo.deleteStock(id);
    }

    async batchDeleteStocks(ids) {
        return await this.inventoryRepo.batchDeleteStocks(ids);
    }

    // ==========================================
    // MOVEMENTS
    // ==========================================
    async getMovements(query = {}) {
        return await this.inventoryRepo.findMovements(query);
    }

    // ==========================================
    // STOCK OPNAMES
    // ==========================================
    async getOpnames(query = {}) {
        const page = parseInt(query.page || 1, 10);
        const limit = parseInt(query.limit || 10, 10);

        const result = await this.inventoryRepo.findOpnames(query);
        const total = result.count;
        const totalPages = Math.ceil(total / limit) || 1;

        const items = result.rows.map(o => ({
            id: o.id,
            documentNo: o.document_no,
            date: o.date,
            warehouse: o.warehouse?.name || '-',
            warehouse_id: o.warehouse_id,
            inspector: o.inspector_name,
            itemsCount: o.items_count,
            discrepancyUnits: parseFloat(o.discrepancy_units) || 0,
            discrepancyValue: parseFloat(o.discrepancy_value) || 0,
            status: o.status,
            notes: o.notes,
            created_at: o.created_at
        }));

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

    async getOpnameMetrics() {
        return await this.inventoryRepo.getOpnameMetrics();
    }

    async getOpnameById(id) {
        return await this.inventoryRepo.findOpnameById(id);
    }

    async createOpname(data, user = null) {
        const now = new Date();
        const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
        const countAll = await this.inventoryRepo.opnameTable.count();
        const document_no = `OPN-${yearMonth}-${String(countAll + 1).padStart(3, '0')}`;

        return await this.server.model.db.transaction(async (t) => {
            const warehouse_id = parseInt(data.warehouse_id, 10);
            let itemsCount = 0;
            let discrepancyUnits = 0;
            let discrepancyValue = 0;
            const opnameItems = [];

            for (const item of data.items) {
                const product_id = parseInt(item.product_id, 10);
                const physical_stock = parseFloat(item.physical_stock) || 0;

                const product = await this.productRepo.findById(product_id);
                const unitPrice = product ? parseFloat(product.selling_price) : 0;

                const stockRecord = await this.inventoryRepo.findStockByWarehouseAndProduct(warehouse_id, product_id, t);
                const system_stock = stockRecord ? parseFloat(stockRecord.quantity) : 0;

                const difference = physical_stock - system_stock;
                const itemDiscrepancyValue = difference * unitPrice;

                itemsCount += 1;
                discrepancyUnits += difference;
                discrepancyValue += itemDiscrepancyValue;

                opnameItems.push({
                    product_id,
                    system_stock,
                    physical_stock,
                    difference,
                    unit_price: unitPrice,
                    discrepancy_value: itemDiscrepancyValue,
                    notes: item.notes || null
                });
            }

            const opname = await this.inventoryRepo.createOpname({
                document_no,
                date: data.date,
                warehouse_id,
                inspector_name: data.inspector_name,
                items_count: itemsCount,
                discrepancy_units: discrepancyUnits,
                discrepancy_value: discrepancyValue,
                status: 'Menunggu Review',
                notes: data.notes || null,
                created_by: user?.id || null
            }, opnameItems, t);

            return opname;
        });
    }

    async approveOpname(id, user = null) {
        return await this.server.model.db.transaction(async (t) => {
            const opname = await this.inventoryRepo.findOpnameById(id);
            if (!opname) return -1;
            if (opname.status === 'Disetujui') return -2;

            // Apply stock reconciliations
            if (opname.items && opname.items.length > 0) {
                for (const item of opname.items) {
                    const diff = parseFloat(item.difference) || 0;
                    if (diff !== 0) {
                        const movementType = diff > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
                        const currentStock = await this.inventoryRepo.findStockByWarehouseAndProduct(opname.warehouse_id, item.product_id, t);
                        const stock_before = currentStock ? parseFloat(currentStock.quantity) : 0;
                        const stock_after = parseFloat(item.physical_stock);

                        await this.inventoryRepo.setStockQuantity(opname.warehouse_id, item.product_id, stock_after, t);

                        await this.inventoryRepo.createMovement({
                            warehouse_id: opname.warehouse_id,
                            product_id: item.product_id,
                            type: movementType,
                            quantity: Math.abs(diff),
                            stock_before,
                            stock_after,
                            reference_type: 'stock_opnames',
                            reference_id: opname.id,
                            notes: `Rekonsiliasi otomatis Opname ${opname.document_no}`,
                            created_by: user?.id || null
                        }, t);
                    }
                }
            }

            await opname.update({ status: 'Disetujui' }, { transaction: t });
            return opname;
        });
    }

    // ==========================================
    // STOCK WASTES
    // ==========================================
    async getWastes(query = {}) {
        const page = parseInt(query.page || 1, 10);
        const limit = parseInt(query.limit || 10, 10);

        const result = await this.inventoryRepo.findWastes(query);
        const total = result.count;
        const totalPages = Math.ceil(total / limit) || 1;

        const items = result.rows.map(w => ({
            id: w.id,
            documentNo: w.document_no,
            date: w.date,
            sku: w.product?.code || '-',
            productName: w.product?.name || '-',
            warehouse: w.warehouse?.name || '-',
            warehouse_id: w.warehouse_id,
            product_id: w.product_id,
            qty: parseFloat(w.quantity) || 0,
            unit: w.product?.unit?.code || 'PCS',
            reason: w.reason,
            lossAmount: parseFloat(w.loss_amount) || 0,
            status: w.status,
            notes: w.notes,
            created_at: w.created_at
        }));

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

    async getWasteMetrics() {
        return await this.inventoryRepo.getWasteMetrics();
    }

    async createWaste(data, user = null) {
        const now = new Date();
        const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
        const countAll = await this.inventoryRepo.wasteTable.count();
        const document_no = `WST-${yearMonth}-${String(countAll + 1).padStart(3, '0')}`;

        return await this.server.model.db.transaction(async (t) => {
            const warehouse_id = parseInt(data.warehouse_id, 10);
            const product_id = parseInt(data.product_id, 10);
            const quantity = parseFloat(data.quantity);

            const product = await this.productRepo.findById(product_id);
            if (!product) return -1;

            const unitPrice = parseFloat(product.selling_price) || 0;
            const loss_amount = quantity * unitPrice;
            const status = data.status || 'Dimusnahkan';

            const currentStock = await this.inventoryRepo.findStockByWarehouseAndProduct(warehouse_id, product_id, t);
            const stock_before = currentStock ? parseFloat(currentStock.quantity) : 0;

            if (stock_before < quantity) {
                return -3; // Stock not sufficient
            }

            const waste = await this.inventoryRepo.createWaste({
                document_no,
                date: data.date,
                warehouse_id,
                product_id,
                quantity,
                unit_price: unitPrice,
                loss_amount,
                reason: data.reason,
                status,
                notes: data.notes || null,
                created_by: user?.id || null
            }, t);

            // Deduct stock if directly Dimusnahkan or Retur Supplier
            if (status === 'Dimusnahkan' || status === 'Retur Supplier') {
                const stock_after = stock_before - quantity;
                await currentStock.update({ quantity: stock_after }, { transaction: t });

                await this.inventoryRepo.createMovement({
                    warehouse_id,
                    product_id,
                    type: 'WASTE_OUT',
                    quantity,
                    stock_before,
                    stock_after,
                    reference_type: 'stock_wastes',
                    reference_id: waste.id,
                    notes: `Pencatatan barang rusak/terbuang ${document_no} (${data.reason})`,
                    created_by: user?.id || null
                }, t);
            }

            return waste;
        });
    }

    async approveWaste(id, user = null) {
        return await this.server.model.db.transaction(async (t) => {
            const waste = await this.inventoryRepo.findWasteById(id);
            if (!waste) return -1;
            if (waste.status === 'Dimusnahkan') return -2;

            const currentStock = await this.inventoryRepo.findStockByWarehouseAndProduct(waste.warehouse_id, waste.product_id, t);
            const stock_before = currentStock ? parseFloat(currentStock.quantity) : 0;
            const quantity = parseFloat(waste.quantity);

            if (stock_before < quantity) {
                return -3; // Insufficient stock
            }

            const stock_after = stock_before - quantity;
            if (currentStock) {
                await currentStock.update({ quantity: stock_after }, { transaction: t });
            }

            await this.inventoryRepo.createMovement({
                warehouse_id: waste.warehouse_id,
                product_id: waste.product_id,
                type: 'WASTE_OUT',
                quantity,
                stock_before,
                stock_after,
                reference_type: 'stock_wastes',
                reference_id: waste.id,
                notes: `Persetujuan barang rusak/terbuang ${waste.document_no}`,
                created_by: user?.id || null
            }, t);

            await waste.update({ status: 'Dimusnahkan' }, { transaction: t });
            return waste;
        });
    }
}

export default InventoryService;
