import { Op } from "sequelize";

class InventoryRepository {
    constructor(server) {
        this.server = server;
    }

    get stockTable() {
        return this.server.model?.warehouseStocks?.table;
    }

    get movementTable() {
        return this.server.model?.stockMovements?.table;
    }

    get opnameTable() {
        return this.server.model?.stockOpnames?.table;
    }

    get opnameItemTable() {
        return this.server.model?.stockOpnameItems?.table;
    }

    get wasteTable() {
        return this.server.model?.stockWastes?.table;
    }

    get warehouseTable() {
        return this.server.model?.warehouses?.table;
    }

    get productTable() {
        return this.server.model?.products?.table;
    }

    get unitTable() {
        return this.server.model?.units?.table;
    }

    get categoryTable() {
        return this.server.model?.productCategories?.table;
    }

    get userTable() {
        return this.server.model?.users?.table;
    }

    // ==========================================
    // STOCKS
    // ==========================================
    async findStocks({ search = '', warehouse_id = '', warehouse_name = '', status = '', sort = 'created_at', order = 'DESC', page = 1, limit = 10 } = {}) {
        if (!this.stockTable) return { count: 0, rows: [] };

        const where = {};
        const productWhere = {};
        const warehouseWhere = {};

        if (search && search.trim() !== '') {
            const query = `%${search.trim()}%`;
            productWhere[Op.or] = [
                { name: { [Op.like]: query } },
                { code: { [Op.like]: query } }
            ];
        }

        if (warehouse_id && warehouse_id !== 'Semua' && warehouse_id !== 'all') {
            where.warehouse_id = parseInt(warehouse_id, 10);
        } else if (warehouse_name && warehouse_name !== 'Semua' && warehouse_name !== 'all') {
            warehouseWhere.name = warehouse_name;
        }

        if (status && status !== 'Semua' && status !== 'all') {
            if (status === 'Habis') {
                where.quantity = { [Op.lte]: 0 };
            } else if (status === 'Menipis') {
                // quantity > 0 AND quantity <= min_stock
                where[Op.and] = [
                    { quantity: { [Op.gt]: 0 } },
                    this.server.model.db.where(
                        this.server.model.db.col('warehouse_stocks.quantity'),
                        '<=',
                        this.server.model.db.col('warehouse_stocks.min_stock')
                    )
                ];
            } else if (status === 'Aman') {
                where[Op.and] = [
                    this.server.model.db.where(
                        this.server.model.db.col('warehouse_stocks.quantity'),
                        '>',
                        this.server.model.db.col('warehouse_stocks.min_stock')
                    )
                ];
            }
        }

        const offset = (Math.max(page, 1) - 1) * limit;

        const includes = [
            {
                model: this.warehouseTable,
                as: 'warehouse',
                attributes: ['id', 'code', 'name', 'address', 'status'],
                where: Object.keys(warehouseWhere).length ? warehouseWhere : undefined
            },
            {
                model: this.productTable,
                as: 'product',
                attributes: ['id', 'code', 'name', 'selling_price', 'status'],
                where: Object.keys(productWhere).length ? productWhere : undefined,
                include: [
                    { model: this.unitTable, as: 'unit', attributes: ['id', 'code', 'name'] },
                    { model: this.categoryTable, as: 'category', attributes: ['id', 'code', 'name'] }
                ]
            }
        ];

        let orderClause = [['created_at', order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']];
        if (sort === 'quantity' || sort === 'min_stock' || sort === 'id') {
            orderClause = [[sort, order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']];
        }

        return await this.stockTable.findAndCountAll({
            where,
            include: includes,
            order: orderClause,
            offset,
            limit: parseInt(limit, 10),
            distinct: true
        });
    }

    async getStockMetrics() {
        if (!this.stockTable) {
            return { total_items: 0, total_physical_units: 0, critical_stock_count: 0, total_valuation: 0 };
        }

        const allStocks = await this.stockTable.findAll({
            include: [
                {
                    model: this.productTable,
                    as: 'product',
                    attributes: ['selling_price']
                }
            ]
        });

        const total_items = allStocks.length;
        let total_physical_units = 0;
        let critical_stock_count = 0;
        let total_valuation = 0;

        for (const s of allStocks) {
            const qty = parseFloat(s.quantity) || 0;
            const minStock = parseFloat(s.min_stock) || 0;
            const price = parseFloat(s.product?.selling_price) || 0;

            total_physical_units += qty;
            if (qty <= minStock) {
                critical_stock_count += 1;
            }
            total_valuation += qty * price;
        }

        return {
            total_items,
            total_physical_units,
            critical_stock_count,
            total_valuation
        };
    }

    async findStockByWarehouseAndProduct(warehouse_id, product_id, transaction = null) {
        if (!this.stockTable) return null;
        return await this.stockTable.findOne({
            where: { warehouse_id, product_id },
            transaction
        });
    }

    async findStockById(id) {
        if (!this.stockTable) return null;
        return await this.stockTable.findByPk(id, {
            include: [
                { model: this.warehouseTable, as: 'warehouse' },
                { model: this.productTable, as: 'product' }
            ]
        });
    }

    async upsertStock({ warehouse_id, product_id, quantity, min_stock = 10 }, transaction = null) {
        let stock = await this.findStockByWarehouseAndProduct(warehouse_id, product_id, transaction);
        if (stock) {
            const newQty = parseFloat(stock.quantity) + parseFloat(quantity);
            await stock.update({
                quantity: Math.max(0, newQty),
                min_stock: min_stock !== undefined ? min_stock : stock.min_stock
            }, { transaction });
            return stock;
        } else {
            return await this.stockTable.create({
                warehouse_id,
                product_id,
                quantity: Math.max(0, parseFloat(quantity)),
                min_stock: min_stock !== undefined ? min_stock : 10
            }, { transaction });
        }
    }

    async setStockQuantity(warehouse_id, product_id, newQuantity, transaction = null) {
        let stock = await this.findStockByWarehouseAndProduct(warehouse_id, product_id, transaction);
        if (stock) {
            await stock.update({ quantity: Math.max(0, parseFloat(newQuantity)) }, { transaction });
            return stock;
        } else {
            return await this.stockTable.create({
                warehouse_id,
                product_id,
                quantity: Math.max(0, parseFloat(newQuantity)),
                min_stock: 10
            }, { transaction });
        }
    }

    async deleteStock(id) {
        if (!this.stockTable) return 0;
        return await this.stockTable.destroy({ where: { id } });
    }

    async batchDeleteStocks(ids) {
        if (!this.stockTable || !ids || ids.length === 0) return 0;
        return await this.stockTable.destroy({ where: { id: { [Op.in]: ids } } });
    }

    // ==========================================
    // MOVEMENTS
    // ==========================================
    async createMovement(data, transaction = null) {
        if (!this.movementTable) return null;
        return await this.movementTable.create(data, { transaction });
    }

    async findMovements({ warehouse_id = '', product_id = '', type = '', page = 1, limit = 20 } = {}) {
        if (!this.movementTable) return { count: 0, rows: [] };

        const where = {};
        if (warehouse_id && warehouse_id !== 'all') where.warehouse_id = warehouse_id;
        if (product_id && product_id !== 'all') where.product_id = product_id;
        if (type && type !== 'all') where.type = type;

        const offset = (Math.max(page, 1) - 1) * limit;

        return await this.movementTable.findAndCountAll({
            where,
            include: [
                { model: this.warehouseTable, as: 'warehouse', attributes: ['id', 'code', 'name'] },
                { model: this.productTable, as: 'product', attributes: ['id', 'code', 'name'] },
                { model: this.userTable, as: 'creator', attributes: ['id', 'name', 'username'] }
            ],
            order: [['created_at', 'DESC']],
            offset,
            limit: parseInt(limit, 10)
        });
    }

    // ==========================================
    // STOCK OPNAMES
    // ==========================================
    async findOpnames({ search = '', warehouse_id = '', status = '', sort = 'date', order = 'DESC', page = 1, limit = 10 } = {}) {
        if (!this.opnameTable) return { count: 0, rows: [] };

        const where = {};
        if (search && search.trim() !== '') {
            const query = `%${search.trim()}%`;
            where[Op.or] = [
                { document_no: { [Op.like]: query } },
                { inspector_name: { [Op.like]: query } },
                { notes: { [Op.like]: query } }
            ];
        }

        if (warehouse_id && warehouse_id !== 'Semua' && warehouse_id !== 'all') {
            where.warehouse_id = parseInt(warehouse_id, 10);
        }

        if (status && status !== 'Semua' && status !== 'all') {
            where.status = status;
        }

        const offset = (Math.max(page, 1) - 1) * limit;
        const validSorts = ['id', 'document_no', 'date', 'items_count', 'discrepancy_units', 'discrepancy_value', 'status', 'created_at'];
        const sortField = validSorts.includes(sort) ? sort : 'date';

        return await this.opnameTable.findAndCountAll({
            where,
            include: [
                { model: this.warehouseTable, as: 'warehouse', attributes: ['id', 'code', 'name'] },
                { model: this.userTable, as: 'creator', attributes: ['id', 'name'] }
            ],
            order: [[sortField, order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']],
            offset,
            limit: parseInt(limit, 10)
        });
    }

    async getOpnameMetrics() {
        if (!this.opnameTable) return { total_opname: 0, approved_count: 0, pending_count: 0, accuracy_rate: 100 };

        const all = await this.opnameTable.findAll({ attributes: ['status', 'discrepancy_units', 'items_count'] });
        const total_opname = all.length;
        const approved_count = all.filter(o => o.status === 'Disetujui').length;
        const pending_count = all.filter(o => o.status === 'Menunggu Review').length;

        // Calculate accuracy
        let totalItems = 0;
        let totalDiscrepancies = 0;
        for (const o of all) {
            totalItems += (o.items_count || 0);
            totalDiscrepancies += Math.abs(parseFloat(o.discrepancy_units) || 0);
        }

        const accuracy_rate = totalItems > 0
            ? Math.max(0, Math.min(100, ((totalItems - totalDiscrepancies) / totalItems) * 100))
            : 98.6;

        return {
            total_opname,
            approved_count,
            pending_count,
            accuracy_rate: parseFloat(accuracy_rate.toFixed(1))
        };
    }

    async findOpnameById(id) {
        if (!this.opnameTable) return null;
        return await this.opnameTable.findByPk(id, {
            include: [
                { model: this.warehouseTable, as: 'warehouse' },
                { model: this.userTable, as: 'creator', attributes: ['id', 'name', 'username'] },
                {
                    model: this.opnameItemTable,
                    as: 'items',
                    include: [
                        {
                            model: this.productTable,
                            as: 'product',
                            include: [{ model: this.unitTable, as: 'unit' }]
                        }
                    ]
                }
            ]
        });
    }

    async createOpname(data, items, transaction = null) {
        const opname = await this.opnameTable.create(data, { transaction });
        if (items && items.length > 0) {
            const itemsWithId = items.map(item => ({
                ...item,
                stock_opname_id: opname.id
            }));
            await this.opnameItemTable.bulkCreate(itemsWithId, { transaction });
        }
        return opname;
    }

    async updateOpname(id, data, transaction = null) {
        const opname = await this.opnameTable.findByPk(id, { transaction });
        if (!opname) return null;
        return await opname.update(data, { transaction });
    }

    // ==========================================
    // STOCK WASTES
    // ==========================================
    async findWastes({ search = '', warehouse_id = '', reason = '', status = '', sort = 'date', order = 'DESC', page = 1, limit = 10 } = {}) {
        if (!this.wasteTable) return { count: 0, rows: [] };

        const where = {};
        const productWhere = {};

        if (search && search.trim() !== '') {
            const query = `%${search.trim()}%`;
            where[Op.or] = [
                { document_no: { [Op.like]: query } },
                { notes: { [Op.like]: query } }
            ];
            productWhere[Op.or] = [
                { name: { [Op.like]: query } },
                { code: { [Op.like]: query } }
            ];
        }

        if (warehouse_id && warehouse_id !== 'Semua' && warehouse_id !== 'all') {
            where.warehouse_id = parseInt(warehouse_id, 10);
        }

        if (reason && reason !== 'Semua' && reason !== 'all') {
            where.reason = reason;
        }

        if (status && status !== 'Semua' && status !== 'all') {
            where.status = status;
        }

        const offset = (Math.max(page, 1) - 1) * limit;
        const validSorts = ['id', 'document_no', 'date', 'quantity', 'loss_amount', 'reason', 'status', 'created_at'];
        const sortField = validSorts.includes(sort) ? sort : 'date';

        return await this.wasteTable.findAndCountAll({
            where,
            include: [
                { model: this.warehouseTable, as: 'warehouse', attributes: ['id', 'code', 'name'] },
                {
                    model: this.productTable,
                    as: 'product',
                    attributes: ['id', 'code', 'name', 'selling_price'],
                    where: Object.keys(productWhere).length ? productWhere : undefined,
                    include: [{ model: this.unitTable, as: 'unit', attributes: ['id', 'code', 'name'] }]
                },
                { model: this.userTable, as: 'creator', attributes: ['id', 'name'] }
            ],
            order: [[sortField, order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']],
            offset,
            limit: parseInt(limit, 10)
        });
    }

    async getWasteMetrics() {
        if (!this.wasteTable) return { total_incidents: 0, total_units_wasted: 0, total_loss: 0, waste_rate: 0 };

        const all = await this.wasteTable.findAll({
            attributes: ['quantity', 'loss_amount']
        });

        const total_incidents = all.length;
        let total_units_wasted = 0;
        let total_loss = 0;

        for (const w of all) {
            total_units_wasted += parseFloat(w.quantity) || 0;
            total_loss += parseFloat(w.loss_amount) || 0;
        }

        return {
            total_incidents,
            total_units_wasted,
            total_loss,
            waste_rate: 0.28
        };
    }

    async findWasteById(id) {
        if (!this.wasteTable) return null;
        return await this.wasteTable.findByPk(id, {
            include: [
                { model: this.warehouseTable, as: 'warehouse' },
                {
                    model: this.productTable,
                    as: 'product',
                    include: [{ model: this.unitTable, as: 'unit' }]
                },
                { model: this.userTable, as: 'creator', attributes: ['id', 'name'] }
            ]
        });
    }

    async createWaste(data, transaction = null) {
        if (!this.wasteTable) return null;
        return await this.wasteTable.create(data, { transaction });
    }

    async updateWaste(id, data, transaction = null) {
        const waste = await this.wasteTable.findByPk(id, { transaction });
        if (!waste) return null;
        return await waste.update(data, { transaction });
    }
}

export default InventoryRepository;
