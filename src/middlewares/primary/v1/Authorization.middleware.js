// Helpers
import { ResponsePresetHelper } from '#helpers';

// Library
import JWT from "jsonwebtoken";

class Authorization {
    constructor(server) {
        this.server = server;
        this.ResponsePreset = new ResponsePresetHelper(this.server);
    }

    check() {
        return (req, res, next) => {
            if (!req.headers['authorization'] && req.query.token) req.headers['authorization'] = req.query.token;
            if (!req.middlewares) req.middlewares = {};
            req.middlewares.authorization = {};

            let token = req.headers['authorization'];
            if (token && token.startsWith('Bearer ')) {
                token = token.slice(7).trim();
            }

            if (!token || token === 'undefined') {
                if (this.optionalRoutes(req) === true) return next();

                return res.status(401).json(this.ResponsePreset.resErr(
                    401,
                    'Request Unauthorized: Token is missing',
                    'token',
                    { code: -1 }
                ));
            }

            JWT.verify(token, this.server.env.JWT_TOKEN_SECRET, async (err, data) => {
                if (err) {
                    if (err.name !== 'TokenExpiredError') {
                        return res.status(401).json(this.ResponsePreset.resErr(
                            401,
                            'Token Unauthorized: Invalid signature',
                            'token',
                            { code: -2 }
                        ));
                    }

                    return res.status(401).json(this.ResponsePreset.resErr(
                        401,
                        'Token Expired',
                        'token',
                        { code: -3 }
                    ));
                }

                req.middlewares.authorization = data;
                return next();
            });
        };
    }

    optionalRoutes(req) {
        switch (true) {
            default: return false;
        }
    }
}

export default Authorization;