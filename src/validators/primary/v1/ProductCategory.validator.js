class ProductCategoryValidator {
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
            "description": {
                "type": ["string", "null"]
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

export default ProductCategoryValidator;
