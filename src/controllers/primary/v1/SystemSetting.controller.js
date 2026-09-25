import { ResponsePresetHelper } from '#helpers';
import { SystemSettingValidator } from '#validatorsPrimaryV1';
import { SystemSettingService } from '#servicesPrimaryV1';
import Ajv from 'ajv';

class SystemSettingController {
    constructor(server) {
        this.server = server;
        this.ResponsePreset = new ResponsePresetHelper();
        this.Ajv = new Ajv();
        this.DataScheme = new SystemSettingValidator();
        this.settingService = new SystemSettingService(this.server);
    }

    async getSettings(req, res) {
        try {
            const settings = await this.settingService.getSystemSettings();
            return res.status(200).json(this.ResponsePreset.resOK('OK', settings));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async updatePin(req, res) {
        try {
            const schemeValidate = this.Ajv.compile(this.DataScheme.updatePin);
            if (!schemeValidate(req.body)) {
                return res.status(400).json(this.ResponsePreset.resErr(
                    400,
                    schemeValidate.errors[0].message,
                    'validator',
                    schemeValidate.errors[0]
                ));
            }

            const result = await this.settingService.updatePinSettings(req.body, req.user);
            if (result.error) {
                return res.status(400).json(this.ResponsePreset.resErr(
                    400,
                    result.message,
                    'setting',
                    { code: result.error }
                ));
            }

            return res.status(200).json(this.ResponsePreset.resOK('Pengaturan PIN berhasil diperbarui', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async updateForceSalesOrder(req, res) {
        try {
            const schemeValidate = this.Ajv.compile(this.DataScheme.updateForceSalesOrder);
            if (!schemeValidate(req.body)) {
                return res.status(400).json(this.ResponsePreset.resErr(
                    400,
                    schemeValidate.errors[0].message,
                    'validator',
                    schemeValidate.errors[0]
                ));
            }

            const result = await this.settingService.updateForceSalesOrder(req.body, req.user);
            if (result.error) {
                return res.status(400).json(this.ResponsePreset.resErr(
                    400,
                    result.message,
                    'setting',
                    { code: result.error }
                ));
            }

            return res.status(200).json(this.ResponsePreset.resOK('Pengaturan Force Sales Order berhasil diperbarui', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async verifyPin(req, res) {
        try {
            const schemeValidate = this.Ajv.compile(this.DataScheme.verifyPin);
            if (!schemeValidate(req.body)) {
                return res.status(400).json(this.ResponsePreset.resErr(
                    400,
                    schemeValidate.errors[0].message,
                    'validator',
                    schemeValidate.errors[0]
                ));
            }

            const result = await this.settingService.verifyPin(req.body.pin);
            if (!result.valid) {
                return res.status(400).json(this.ResponsePreset.resErr(
                    400,
                    result.message || 'PIN tidak valid',
                    'pin',
                    { valid: false }
                ));
            }

            return res.status(200).json(this.ResponsePreset.resOK('PIN terverifikasi', { valid: true }));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }
}

export default SystemSettingController;
