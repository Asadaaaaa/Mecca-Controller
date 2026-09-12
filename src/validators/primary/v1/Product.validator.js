class ProductValidator {
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
                "maxLength": 200
            },
            "category_id": {
                "type": ["integer", "null"]
            },
            "unit_id": {
                "type": "integer"
            },
            "selling_price": {
                "type": "number",
                "minimum": 0
            },
            "tax_id": {
                "type": ["integer", "null"]
            },
            "description": {
                "type": ["string", "null"]
            },
            "status": {
                "type": "string",
                "enum": ["active", "inactive"]
            }
        },
        "required": ["name", "unit_id", "selling_price"],
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
                "maxLength": 200
            },
            "category_id": {
                "type": ["integer", "null"]
            },
            "unit_id": {
                "type": "integer"
            },
            "selling_price": {
                "type": "number",
                "minimum": 0
            },
            "tax_id": {
                "type": ["integer", "null"]
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

export default ProductValidator;
