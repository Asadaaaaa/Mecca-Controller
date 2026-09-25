class CustomerValidator {
    create = {
        "type": "object",
        "properties": {
            "name": {
                "type": "string",
                "minLength": 1,
                "maxLength": 150
            },
            "pic_name": {
                "type": ["string", "null"],
                "maxLength": 100
            },
            "phone": {
                "type": ["string", "null"],
                "maxLength": 30
            },
            "email": {
                "type": ["string", "null"],
                "maxLength": 150
            },
            "address": {
                "type": ["string", "null"]
            }
        },
        "required": ["name"],
        "additionalProperties": false
    };

    update = {
        "type": "object",
        "properties": {
            "name": {
                "type": "string",
                "minLength": 1,
                "maxLength": 150
            },
            "pic_name": {
                "type": ["string", "null"],
                "maxLength": 100
            },
            "phone": {
                "type": ["string", "null"],
                "maxLength": 30
            },
            "email": {
                "type": ["string", "null"],
                "maxLength": 150
            },
            "address": {
                "type": ["string", "null"]
            }
        },
        "additionalProperties": false
    };

    batchDelete = {
        "type": "object",
        "properties": {
            "ids": {
                "type": "array",
                "items": {
                    "type": "integer"
                },
                "minItems": 1
            }
        },
        "required": ["ids"],
        "additionalProperties": false
    };
}

export default CustomerValidator;
