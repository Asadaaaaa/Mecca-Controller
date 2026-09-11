import { ResponsePresetHelper } from '#helpers';
import { RoleValidator } from '#validatorsPrimaryV1';
import { RoleService } from '#servicesPrimaryV1';
import Ajv from 'ajv';

class RoleController {
    constructor(server) {
        this.server = server;
        this.ResponsePreset = new ResponsePresetHelper();
        this.Ajv = new Ajv();
        this.DataScheme = new RoleValidator();
        this.RoleService = new RoleService(this.server);
    }

    async list(req, res) {
        try {
            const roles = await this.RoleService.getRoles(req.query);
            return res.status(200).json(this.ResponsePreset.resOK('OK', roles));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async permissions(req, res) {
        try {
            const permissions = await this.RoleService.getPermissions();
            return res.status(200).json(this.ResponsePreset.resOK('OK', permissions));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async metrics(req, res) {
        try {
            const metrics = await this.RoleService.getRoleMetrics();
            return res.status(200).json(this.ResponsePreset.resOK('OK', metrics));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async get(req, res) {
        try {
            const id = req.params.id;
            const role = await this.RoleService.getRoleById(id);
            if (role === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Role not found', 'role', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('OK', role));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async create(req, res) {
        try {
            const schemeValidate = this.Ajv.compile(this.DataScheme.create);
            if (!schemeValidate(req.body)) {
                return res.status(400).json(this.ResponsePreset.resErr(
                    400,
                    schemeValidate.errors[0].message,
                    'validator',
                    schemeValidate.errors[0]
                ));
            }

            const role = await this.RoleService.createRole(req.body);
            if (role === -2) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Role name already exists', 'role', { code: -2 }));
            }
            return res.status(201).json(this.ResponsePreset.resOK('Role created successfully', role));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async update(req, res) {
        try {
            const schemeValidate = this.Ajv.compile(this.DataScheme.update);
            if (!schemeValidate(req.body)) {
                return res.status(400).json(this.ResponsePreset.resErr(
                    400,
                    schemeValidate.errors[0].message,
                    'validator',
                    schemeValidate.errors[0]
                ));
            }

            const id = req.params.id;
            const updated = await this.RoleService.updateRole(id, req.body);
            if (updated === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Role not found', 'role', { code: -1 }));
            }
            if (updated === -2) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Role name already exists', 'role', { code: -2 }));
            }
            if (updated === -3) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Cannot rename superadmin role', 'role', { code: -3 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Role updated successfully', updated));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async delete(req, res) {
        try {
            const id = req.params.id;
            const result = await this.RoleService.deleteRole(id);
            if (result === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'Role not found', 'role', { code: -1 }));
            }
            if (result === -4) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Cannot delete superadmin role', 'role', { code: -4 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('Role deleted successfully', { id }));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }
}

export default RoleController;
