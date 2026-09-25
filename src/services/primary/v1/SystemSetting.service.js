import { SystemSettingRepository } from '#repositoriesPrimaryV1';
import { Sha256Helper } from '#helpers';

class SystemSettingService {
    constructor(server) {
        this.server = server;
        this.settingRepo = new SystemSettingRepository(this.server);
        this.sha256Helper = new Sha256Helper(this.server);
    }

    hashPin(pin) {
        return this.sha256Helper.getHash(String(pin), this.server.env.HASH_SALT_PASSWORD);
    }

    async getSystemSettings() {
        const map = await this.settingRepo.getSettingsMap();
        const pinRow = await this.settingRepo.getSettingByKey('security_pin_enabled');
        const forceRow = await this.settingRepo.getSettingByKey('force_sales_order_enabled');

        return {
            security_pin_enabled: map['security_pin_enabled'] === 'true',
            has_pin_configured: Boolean(map['security_pin_hash']),
            force_sales_order_enabled: map['force_sales_order_enabled'] === 'true',
            updated_at: forceRow?.updated_at || pinRow?.updated_at || new Date()
        };
    }

    async verifyPin(pin) {
        const map = await this.settingRepo.getSettingsMap();
        const pinEnabled = map['security_pin_enabled'] === 'true';
        const storedHash = map['security_pin_hash'];

        // If PIN is not enabled and not configured, allow
        if (!pinEnabled && !storedHash) {
            return { valid: true };
        }

        if (!pin || String(pin).length !== 6) {
            return { valid: false, message: 'PIN harus berupa 6 digit angka.' };
        }

        const hashed = this.hashPin(pin);
        if (hashed === storedHash) {
            return { valid: true };
        } else {
            return { valid: false, message: 'PIN tidak valid.' };
        }
    }

    async updatePinSettings(data, user = null) {
        const map = await this.settingRepo.getSettingsMap();
        const isCurrentlyEnabled = map['security_pin_enabled'] === 'true';
        const currentHash = map['security_pin_hash'];

        // If a new PIN is being set and PIN is already configured and active, require current_pin verification
        if (data.pin && isCurrentlyEnabled && currentHash) {
            if (!data.current_pin) {
                return { error: 'CURRENT_PIN_REQUIRED', message: 'PIN saat ini wajib dimasukkan untuk mengubah PIN.' };
            }
            if (this.hashPin(data.current_pin) !== currentHash) {
                return { error: 'INVALID_CURRENT_PIN', message: 'PIN saat ini salah.' };
            }
        }

        const userId = user?.id || null;

        // If new PIN is provided
        if (data.pin) {
            if (!/^\d{6}$/.test(String(data.pin))) {
                return { error: 'INVALID_PIN_FORMAT', message: 'PIN harus berupa tepat 6 digit angka.' };
            }
            const newHash = this.hashPin(data.pin);
            await this.settingRepo.upsertSetting('security_pin_hash', newHash, 'Hash SHA-256 dari 6 digit PIN otorisasi', userId);
        }

        // If enabled status is provided
        if (typeof data.enabled === 'boolean') {
            const willHavePin = Boolean(data.pin) || Boolean(currentHash);
            if (data.enabled && !willHavePin) {
                return { error: 'PIN_NOT_SET', message: 'PIN 6 digit harus dibuat terlebih dahulu sebelum mengaktifkan fitur PIN.' };
            }
            await this.settingRepo.upsertSetting('security_pin_enabled', String(data.enabled), 'Status aktifasi keamanan PIN otorisasi transaksi', userId);
        }

        return await this.getSystemSettings();
    }

    async updateForceSalesOrder(data, user = null) {
        const map = await this.settingRepo.getSettingsMap();
        const pinEnabled = map['security_pin_enabled'] === 'true';
        const currentHash = map['security_pin_hash'];

        // Require PIN verification only when ENABLING force SO and PIN security is active
        // Turning OFF (mematikan) does NOT require PIN
        if (data.enabled && pinEnabled && currentHash) {
            if (!data.pin) {
                return { error: 'PIN_REQUIRED', message: 'PIN 6 digit wajib dimasukkan untuk mengaktifkan pengaturan ini.' };
            }
            if (this.hashPin(data.pin) !== currentHash) {
                return { error: 'INVALID_PIN', message: 'PIN tidak valid.' };
            }
        }

        const userId = user?.id || null;
        await this.settingRepo.upsertSetting('force_sales_order_enabled', String(data.enabled), 'Izinkan paksa buat Sales Order walau stok kurang dengan otorisasi PIN', userId);

        return await this.getSystemSettings();
    }
}

export default SystemSettingService;
