class WarehouseValidator {
    create = {
        "type": "object",
        "properties": {
            "code": {
                "type": "string",
                "minLength": 1,
                "maxLength": 50
            },
            "name": {
                "type": "string",
                "minLength": 1,
                "maxLength": 150
            },
            "address": {
                "type": ["string", "null"]
            },
            "pic_name": {
                "type": ["string", "null"],
                "maxLength": 100
            },
            "phone": {
                "type": ["string", "null"],
                "maxLength": 30
            },
            "status": {
                "type": "string",
                "enum": ["active", "inactive"]
            }
        },
        "required": ["name"],
        "additionalProperties": false
    };

    update = {
        "type": "object",
        "properties": {
            "code": {
                "type": "string",
                "minLength": 1,
                "maxLength": 50
            },
            "name": {
                "type": "string",
                "minLength": 1,
                "maxLength": 150
            },
            "address": {
                "type": ["string", "null"]
            },
            "pic_name": {
                "type": ["string", "null"],
                "maxLength": 100
            },
            "phone": {
                "type": ["string", "null"],
                "maxLength": 30
            },
            "status": {
                "type": "string",
                "enum": ["active", "inactive"]
            }
        },
        "additionalProperties": false
    };
}

export default WarehouseValidator;
