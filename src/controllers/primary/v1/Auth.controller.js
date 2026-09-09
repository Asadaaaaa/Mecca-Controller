import { ResponsePresetHelper } from '#helpers';
import { AuthValidator } from '#validatorsPrimaryV1';
import { AuthService } from '#servicesPrimaryV1';

// Library
import Ajv from 'ajv';

class AuthController {
    constructor(server) {
        this.server = server;

        this.ResponsePreset = new ResponsePresetHelper();
        this.Ajv = new Ajv();
        this.DataScheme = new AuthValidator();
        this.AuthService = new AuthService(this.server);
    }

    async login(req, res) {
        const schemeValidate = this.Ajv.compile(this.DataScheme.login);
        if (!schemeValidate(req.body)) return res.status(400).json(this.ResponsePreset.resErr(
            400,
            schemeValidate.errors[0].message,
            'validator',
            schemeValidate.errors[0]
        ));

        const { identity, password } = req.body;
        const loginSrv = await this.AuthService.login(identity, password);

        if (loginSrv === -1) return res.status(401).json(this.ResponsePreset.resErr(
            401,
            'Identity or password is wrong',
            'auth',
            { code: -1 }
        ));

        if (loginSrv === -2) return res.status(403).json(this.ResponsePreset.resErr(
            403,
            'Account is not active',
            'auth',
            { code: -2 }
        ));

        return res.status(200).json(this.ResponsePreset.resOK('OK', loginSrv));
    }

    async refreshToken(req, res) {
        const schemeValidate = this.Ajv.compile(this.DataScheme.refreshToken);
        if (!schemeValidate(req.body)) return res.status(400).json(this.ResponsePreset.resErr(
            400,
            schemeValidate.errors[0].message,
            'validator',
            schemeValidate.errors[0]
        ));

        const token = req.headers['authorization'] || req.body.token;
        const { refreshToken } = req.body;

        const refreshSrv = await this.AuthService.refreshToken(token, refreshToken);
        if (refreshSrv === -1) return res.status(401).json(this.ResponsePreset.resErr(
            401,
            'Invalid or expired refresh token',
            'token',
            { code: -2 }
        ));

        return res.status(200).json(this.ResponsePreset.resOK('Token refreshed successfully', refreshSrv));
    }

    async me(req, res) {
        const userId = req.middlewares?.authorization?.data?.userId;
        if (!userId) return res.status(401).json(this.ResponsePreset.resErr(
            401,
            'Unauthorized',
            'token',
            { code: -1 }
        ));

        const profile = await this.AuthService.getProfile(userId);
        if (!profile) return res.status(404).json(this.ResponsePreset.resErr(
            404,
            'User profile not found',
            'user',
            { code: -1 }
        ));

        return res.status(200).json(this.ResponsePreset.resOK('OK', profile));
    }
}

export default AuthController;