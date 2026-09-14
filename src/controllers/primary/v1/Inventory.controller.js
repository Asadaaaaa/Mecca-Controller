import { ResponsePresetHelper } from '#helpers';
import { InventoryValidator } from '#validatorsPrimaryV1';
import { InventoryService } from '#servicesPrimaryV1';
import Ajv from 'ajv';

class InventoryController {
    constructor(server) {
        this.server = server;
        this.ResponsePreset = new ResponsePresetHelper();
        this.Ajv = new Ajv();
        this.DataScheme = new InventoryValidator();
        this.InventoryService = new InventoryService(this.server);
    }

    // ==========================================
    // STOCKS
    // ==========================================
    async listStocks(req, res) {
        try {
            const result = await this.InventoryService.getStocks(req.query);
            return res.status(200).json(this.ResponsePreset.resOK('OK', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async stockMetrics(req, res) {
        try {
            const metrics = await this.InventoryService.getStockMetrics();
            return res.status(200).json(this.ResponsePreset.resOK('OK', metrics));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async stockAdjustment(req, res) {
        try {
            const schemeValidate = this.Ajv.compile(this.DataScheme.stockAdjustment);
            if (!schemeValidate(req.body)) {
                return res.status(400).json(this.ResponsePreset.resErr(
                    400,
                    schemeValidate.errors[0].message,
                    'validator',
                    schemeValidate.errors[0]
                ));
            }

            const result = await this.InventoryService.stockAdjustment(req.body, req.user);
            if (result === -3) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Saldo stok tidak mencukupi untuk pengurangan', 'inventory', { code: -3 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Penyesuaian stok berhasil disimpan', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async deleteStock(req, res) {
        try {
            const id = req.params.id;
            await this.InventoryService.deleteStock(id);
            return res.status(200).json(this.ResponsePreset.resOK('Data stok berhasil dihapus'));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async batchDeleteStocks(req, res) {
        try {
            const schemeValidate = this.Ajv.compile(this.DataScheme.batchDelete);
            if (!schemeValidate(req.body)) {
                return res.status(400).json(this.ResponsePreset.resErr(
                    400,
                    schemeValidate.errors[0].message,
                    'validator',
                    schemeValidate.errors[0]
                ));
            }

            await this.InventoryService.batchDeleteStocks(req.body.ids);
            return res.status(200).json(this.ResponsePreset.resOK(`${req.body.ids.length} data stok berhasil dihapus`));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    // ==========================================
    // MOVEMENTS
    // ==========================================
    async listMovements(req, res) {
        try {
            const result = await this.InventoryService.getMovements(req.query);
            return res.status(200).json(this.ResponsePreset.resOK('OK', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    // ==========================================
    // STOCK OPNAMES
    // ==========================================
    async listOpnames(req, res) {
        try {
            const result = await this.InventoryService.getOpnames(req.query);
            return res.status(200).json(this.ResponsePreset.resOK('OK', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async opnameMetrics(req, res) {
        try {
            const metrics = await this.InventoryService.getOpnameMetrics();
            return res.status(200).json(this.ResponsePreset.resOK('OK', metrics));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async getOpname(req, res) {
        try {
            const id = req.params.id;
            const opname = await this.InventoryService.getOpnameById(id);
            if (!opname) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Sesi opname tidak ditemukan', 'opname', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('OK', opname));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async createOpname(req, res) {
        try {
            const schemeValidate = this.Ajv.compile(this.DataScheme.createOpname);
            if (!schemeValidate(req.body)) {
                return res.status(400).json(this.ResponsePreset.resErr(
                    400,
                    schemeValidate.errors[0].message,
                    'validator',
                    schemeValidate.errors[0]
                ));
            }

            const opname = await this.InventoryService.createOpname(req.body, req.user);
            return res.status(201).json(this.ResponsePreset.resOK('Sesi opname berhasil dicatat', opname));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async approveOpname(req, res) {
        try {
            const id = req.params.id;
            const result = await this.InventoryService.approveOpname(id, req.user);
            if (result === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Sesi opname tidak ditemukan', 'opname', { code: -1 }));
            }
            if (result === -2) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Sesi opname sudah disetujui sebelumnya', 'opname', { code: -2 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Sesi opname disetujui dan saldo stok telah disesuaikan', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    // ==========================================
    // STOCK WASTES
    // ==========================================
    async listWastes(req, res) {
        try {
            const result = await this.InventoryService.getWastes(req.query);
            return res.status(200).json(this.ResponsePreset.resOK('OK', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async wasteMetrics(req, res) {
        try {
            const metrics = await this.InventoryService.getWasteMetrics();
            return res.status(200).json(this.ResponsePreset.resOK('OK', metrics));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async createWaste(req, res) {
        try {
            const schemeValidate = this.Ajv.compile(this.DataScheme.createWaste);
            if (!schemeValidate(req.body)) {
                return res.status(400).json(this.ResponsePreset.resErr(
                    400,
                    schemeValidate.errors[0].message,
                    'validator',
                    schemeValidate.errors[0]
                ));
            }

            const waste = await this.InventoryService.createWaste(req.body, req.user);
            if (waste === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Produk tidak ditemukan', 'waste', { code: -1 }));
            }
            if (waste === -3) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Saldo stok tidak mencukupi untuk pemusnahan barang', 'waste', { code: -3 }));
            }
            return res.status(201).json(this.ResponsePreset.resOK('Pencatatan barang rusak/terbuang berhasil disimpan', waste));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async approveWaste(req, res) {
        try {
            const id = req.params.id;
            const result = await this.InventoryService.approveWaste(id, req.user);
            if (result === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Data barang rusak/terbuang tidak ditemukan', 'waste', { code: -1 }));
            }
            if (result === -2) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Data barang terbuang sudah dimusnahkan sebelumnya', 'waste', { code: -2 }));
            }
            if (result === -3) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Saldo stok tidak mencukupi untuk pemotongan', 'waste', { code: -3 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Persetujuan pemusnahan barang berhasil diproses', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }
}

export default InventoryController;
