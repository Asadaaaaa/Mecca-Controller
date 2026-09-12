class TaxValidator {
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
            "rate": {
                "type": "number",
                "minimum": 0,
                "maximum": 100
            },
            "status": {
                "type": "string",
                "enum": ["active", "inactive"]
            }
        },
        "required": ["code", "name", "rate"],
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
            "rate": {
                "type": "number",
                "minimum": 0,
                "maximum": 100
            },
            "status": {
                "type": "string",
                "enum": ["active", "inactive"]
            }
        },
        "additionalProperties": false
    };
}

export default TaxValidator;
