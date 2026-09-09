// Repositories
import { UserRepository } from '#repositoriesPrimaryV1';

// Helpers
import { JWTHelper, Sha256Helper } from '#helpers';

// Library
import JWT from 'jsonwebtoken';

class AuthService {
    constructor(server) {
        this.server = server;

        this.UserRepository = new UserRepository(this.server);

        // Helpers
        this.JwtHelper = new JWTHelper(this.server);
        this.Sha256Helper = new Sha256Helper(this.server);
    }

    async login(identity, password) {
        const userModelData = await this.UserRepository.getUserDataByIdentity(identity);

        if (userModelData === null) return -1;

        if (userModelData.status && userModelData.status !== 'active') return -2;

        const hashedPassword = this.Sha256Helper.getHash(password, this.server.env.HASH_SALT_PASSWORD);
        if (userModelData.password !== hashedPassword) return -1;

        const tokenData = {
            userId: userModelData.id,
            uuid: userModelData.uuid,
            username: userModelData.username,
            email: userModelData.email,
            name: userModelData.name,
            roles: userModelData.roles ? userModelData.roles.map(r => r.name) : []
        };

        const tokens = this.JwtHelper.generateWithRefreshToken(tokenData, this.server.env.JWT_TOKEN_EXPIRED || '3h');

        return {
            ...tokens,
            user: {
                id: userModelData.id,
                uuid: userModelData.uuid,
                name: userModelData.name,
                username: userModelData.username,
                email: userModelData.email,
                roles: userModelData.roles || []
            }
        };
    }

    async refreshToken(token, refreshToken) {
        let tokenData = null;
        try {
            tokenData = JWT.decode(token);
        } catch (err) {
            return -1;
        }

        const refreshed = await this.JwtHelper.refreshTokenValidation(tokenData, refreshToken);
        if (refreshed === -1 || refreshed === -2 || refreshed === -3) return -1;

        return refreshed;
    }

    async getProfile(userId) {
        return await this.UserRepository.getUserById(userId);
    }
}

export default AuthService;