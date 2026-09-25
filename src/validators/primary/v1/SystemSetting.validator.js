class SystemSettingValidator {
    updatePin = {
        "type": "object",
        "properties": {
            "enabled": {
                "type": "boolean"
            },
            "pin": {
                "type": "string",
                "pattern": "^[0-9]{6}$"
            },
            "current_pin": {
                "type": "string",
                "pattern": "^[0-9]{6}$"
            }
        },
        "additionalProperties": false
    };

    updateForceSalesOrder = {
        "type": "object",
        "properties": {
            "enabled": {
                "type": "boolean"
            },
            "pin": {
                "type": "string",
                "pattern": "^[0-9]{6}$"
            }
        },
        "required": ["enabled"],
        "additionalProperties": false
    };

    verifyPin = {
        "type": "object",
        "properties": {
            "pin": {
                "type": "string",
                "pattern": "^[0-9]{6}$"
            }
        },
        "required": ["pin"],
        "additionalProperties": false
    };
}

export default SystemSettingValidator;
