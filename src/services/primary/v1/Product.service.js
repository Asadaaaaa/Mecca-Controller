import { ProductRepository } from '#repositoriesPrimaryV1';
import { Op } from 'sequelize';
import xlsx from 'xlsx';

class ProductService {
    constructor(server) {
        this.server = server;
        this.ProductRepository = new ProductRepository(this.server);
    }

    async getProducts(query) {
        const page = parseInt(query.page || 1, 10);
        const limit = parseInt(query.limit || 10, 10);
        const search = query.search || '';
        const category_id = query.category_id || '';
        const unit_id = query.unit_id || '';
        const status = query.status || '';
        const sort = query.sort || 'created_at';
        const order = query.order || 'DESC';

        const { count, rows } = await this.ProductRepository.findAll({
            search,
            category_id,
            unit_id,
            status,
            sort,
            order,
            page,
            limit
        });

        return {
            items: rows,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit) || 1
            }
        };
    }

    async getProductMetrics() {
        return await this.ProductRepository.getMetrics();
    }

    async getProductById(id) {
        const product = await this.ProductRepository.findById(id);
        if (!product) return -1;
        return product;
    }

    async generateSku() {
        return await this.ProductRepository.generateNextCode();
    }

    async createProduct(data) {
        const code = data.code || await this.ProductRepository.generateNextCode();

        const existingCode = await this.ProductRepository.findByCode(code);
        if (existingCode) {
            return -2; // Duplicate code
        }

        const newProduct = await this.ProductRepository.create({
            code,
            name: data.name,
            category_id: data.category_id || null,
            unit_id: data.unit_id,
            cost_price: data.cost_price !== undefined ? parseFloat(data.cost_price) : 0,
            selling_price: data.selling_price || 0,
            tax_id: data.tax_id || null,
            description: data.description || null,
            status: data.status || 'active'
        });

        return newProduct;
    }

    async updateProduct(id, data) {
        const existing = await this.ProductRepository.findById(id);
        if (!existing) return -1;

        if (data.code && data.code !== existing.code) {
            const duplicate = await this.ProductRepository.findByCode(data.code);
            if (duplicate) return -2;
        }

        const updated = await this.ProductRepository.update(id, data);
        return updated;
    }

    async deleteProduct(id) {
        const existing = await this.ProductRepository.findById(id);
        if (!existing) return -1;

        const success = await this.ProductRepository.delete(id);
        return success ? 1 : -3;
    }

    async batchDeleteProducts(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return 0;
        return await this.ProductRepository.deleteBatch(ids);
    }

    async bulkImport({ file, raw_data, warehouse_id = 1 }) {
        let rows = [];
        if (file) {
            let base64Data = file;
            if (base64Data.includes(',')) {
                base64Data = base64Data.split(',')[1];
            }
            const buffer = Buffer.from(base64Data, 'base64');
            const workbook = xlsx.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
        } else if (Array.isArray(raw_data)) {
            rows = raw_data;
        } else {
            throw new Error('File spreadsheet atau data baris tidak ditemukan');
        }

        // Find header row (looks for 'SKU' or default row 12 index 11)
        let headerIdx = -1;
        for (let i = 0; i < Math.min(25, rows.length); i++) {
            if (rows[i] && Array.isArray(rows[i])) {
                const rowStr = rows[i].map(c => String(c || '').trim().toUpperCase());
                if (rowStr.includes('SKU')) {
                    headerIdx = i;
                    break;
                }
            }
        }
        if (headerIdx === -1 && rows.length >= 13) {
            headerIdx = 11; // 0-indexed row 12
        }

        const dataRows = headerIdx !== -1 ? rows.slice(headerIdx + 1) : rows;

        const results = {
            total_rows: 0,
            success_count: 0,
            created_products: 0,
            updated_products: 0,
            created_categories: [],
            created_units: [],
            errors: []
        };

        const targetWarehouseId = parseInt(warehouse_id || 1, 10);

        for (let idx = 0; idx < dataRows.length; idx++) {
            const row = dataRows[idx];
            if (!row || !Array.isArray(row) || row.length === 0) continue;

            const rowNumber = (headerIdx !== -1 ? headerIdx + 2 : 1) + idx;
            const rawSku = (row[0] || '').toString().trim();
            const rawName = (row[1] || '').toString().trim();

            if (!rawName) continue;
            results.total_rows++;

            try {
                const v1Choice = (row[3] || '').toString().trim();
                let fullName = rawName;
                if (v1Choice && v1Choice !== '-' && v1Choice !== rawName) {
                    fullName = `${rawName} - ${v1Choice}`;
                }

                // Category (Col H / index 6)
                const categoryName = (row[6] || '').toString().trim();
                let categoryId = null;
                if (categoryName && categoryName !== '-') {
                    const catTable = this.server.model.productCategories.table;
                    let existingCat = await catTable.findOne({ where: { name: categoryName } });
                    if (!existingCat) {
                        const count = await catTable.count();
                        const nextCatCode = `CAT-${(count + 1).toString().padStart(3, '0')}`;
                        existingCat = await catTable.create({
                            code: nextCatCode,
                            name: categoryName,
                            status: 'active'
                        });
                        results.created_categories.push(categoryName);
                    }
                    categoryId = existingCat.id;
                }

                // Unit (Col M / index 11) - Rule: box / boks -> BOX
                const rawUnit = (row[11] || '').toString().trim();
                let unitName = rawUnit || 'PCS';
                let unitCode = (rawUnit || 'PCS').toUpperCase();

                const lowerUnit = (rawUnit || '').toLowerCase();
                if (lowerUnit === 'box' || lowerUnit === 'boks') {
                    unitName = 'Box';
                    unitCode = 'BOX';
                } else if (lowerUnit === 'pcs' || lowerUnit === 'pieces') {
                    unitName = 'PCS';
                    unitCode = 'PCS';
                }

                const unitTable = this.server.model.units.table;
                let existingUnit = await unitTable.findOne({
                    where: {
                        [Op.or]: [
                            { code: unitCode },
                            { name: unitName }
                        ]
                    }
                });

                if (!existingUnit) {
                    existingUnit = await unitTable.create({
                        code: unitCode,
                        name: unitName,
                        status: 'active'
                    });
                    results.created_units.push(unitName);
                }
                const unitId = existingUnit.id;

                // Stock Akhir (Col L / index 10) - clamped >= 0
                const rawStock = parseFloat(row[10]);
                const finalStock = isNaN(rawStock) ? 0 : Math.max(0, rawStock);

                // SKU Code
                let productCode = rawSku;
                if (!productCode || productCode === '-') {
                    productCode = await this.ProductRepository.generateNextCode();
                }

                // Upsert product
                const prodTable = this.server.model.products.table;
                let product = await prodTable.findOne({ where: { code: productCode } });
                if (product) {
                    await product.update({
                        name: fullName,
                        category_id: categoryId || product.category_id,
                        unit_id: unitId
                    });
                    results.updated_products++;
                } else {
                    product = await prodTable.create({
                        code: productCode,
                        name: fullName,
                        category_id: categoryId,
                        unit_id: unitId,
                        cost_price: 0,
                        selling_price: 0,
                        status: 'active'
                    });
                    results.created_products++;
                }

                // Upsert stock in target warehouse
                const stockTable = this.server.model.warehouseStocks.table;
                let stockRecord = await stockTable.findOne({
                    where: {
                        warehouse_id: targetWarehouseId,
                        product_id: product.id
                    }
                });

                if (stockRecord) {
                    await stockRecord.update({ quantity: finalStock });
                } else {
                    await stockTable.create({
                        warehouse_id: targetWarehouseId,
                        product_id: product.id,
                        quantity: finalStock,
                        min_stock: 10
                    });
                }

                // Record initial stock movement
                if (finalStock > 0 && this.server.model.stockMovements?.table) {
                    await this.server.model.stockMovements.table.create({
                        product_id: product.id,
                        warehouse_id: targetWarehouseId,
                        type: 'in',
                        quantity: finalStock,
                        reference_type: 'initial_stock',
                        reference_id: product.id,
                        notes: 'Bulk Import Saldo Awal'
                    });
                }

                results.success_count++;
            } catch (err) {
                results.errors.push({
                    row: rowNumber,
                    sku: rawSku,
                    name: rawName,
                    error: err.message
                });
            }
        }

        return results;
    }
}

export default ProductService;
