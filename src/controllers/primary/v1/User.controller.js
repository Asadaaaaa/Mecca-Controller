import { ResponsePresetHelper } from '#helpers';
import { UserValidator } from '#validatorsPrimaryV1';
import { UserService } from '#servicesPrimaryV1';
import Ajv from 'ajv';

class UserController {
    constructor(server) {
        this.server = server;
        this.ResponsePreset = new ResponsePresetHelper();
        this.Ajv = new Ajv();
        this.DataScheme = new UserValidator();
        this.UserService = new UserService(this.server);
    }

    async list(req, res) {
        try {
            const result = await this.UserService.getUsers(req.query);
            return res.status(200).json(this.ResponsePreset.resOK('OK', result));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async metrics(req, res) {
        try {
            const metrics = await this.UserService.getUserMetrics();
            return res.status(200).json(this.ResponsePreset.resOK('OK', metrics));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async get(req, res) {
        try {
            const id = req.params.id;
            const user = await this.UserService.getUserById(id);
            if (user === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'User not found', 'user', { code: -1 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('OK', user));
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

            const user = await this.UserService.createUser(req.body);
            if (user === -2) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Username already in use', 'user', { code: -2 }));
            }
            if (user === -3) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Email already in use', 'user', { code: -3 }));
            }
            return res.status(201).json(this.ResponsePreset.resOK('User created successfully', user));
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
            const updated = await this.UserService.updateUser(id, req.body);
            if (updated === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'User not found', 'user', { code: -1 }));
            }
            if (updated === -2) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Username already in use', 'user', { code: -2 }));
            }
            if (updated === -3) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Email already in use', 'user', { code: -3 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('User updated successfully', updated));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }

    async delete(req, res) {
        try {
            const id = req.params.id;
            const result = await this.UserService.deleteUser(id);
            if (result === -1) {
                return res.status(404).json(this.ResponsePreset.resErr(404, 'User not found', 'user', { code: -1 }));
            }
            if (result === -4) {
                return res.status(400).json(this.ResponsePreset.resErr(400, 'Cannot delete primary superadmin user', 'user', { code: -4 }));
            }
            return res.status(200).json(this.ResponsePreset.resOK('User deleted successfully', { id }));
        } catch (error) {
            this.server.sendLogs(error);
            return res.status(500).json(this.ResponsePreset.resErr(500, error.message, 'server', { code: -1 }));
        }
    }
}

export default UserController;
