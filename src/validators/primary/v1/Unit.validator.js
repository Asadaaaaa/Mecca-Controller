class UnitValidator {
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
                "maxLength": 100
            },
            "description": {
                "type": ["string", "null"]
            },
            "status": {
                "type": "string",
                "enum": ["active", "inactive"]
            }
        },
        "required": ["code", "name"],
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
                "maxLength": 100
            },
            "description": {
                "type": ["string", "null"]
            },
            "status": {
                "type": "string",
                "enum": ["active", "inactive"]
            }
        },
        "additionalProperties": false
    };
}

export default UnitValidator;
