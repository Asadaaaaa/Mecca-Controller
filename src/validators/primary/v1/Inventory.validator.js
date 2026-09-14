class InventoryValidator {
    stockAdjustment = {
        "type": "object",
        "properties": {
            "warehouse_id": { "type": "integer" },
            "product_id": { "type": "integer" },
            "type": {
                "type": "string",
                "enum": ["STOCK_IN", "ADJUSTMENT_IN", "ADJUSTMENT_OUT"]
            },
            "quantity": {
                "type": "number",
                "minimum": 0.01
            },
            "min_stock": {
                "type": "number",
                "minimum": 0
            },
            "notes": {
                "type": ["string", "null"]
            }
        },
        "required": ["warehouse_id", "product_id", "type", "quantity"],
        "additionalProperties": false
    };

    createOpname = {
        "type": "object",
        "properties": {
            "date": {
                "type": "string",
                "minLength": 10,
                "maxLength": 10
            },
            "warehouse_id": { "type": "integer" },
            "inspector_name": {
                "type": "string",
                "minLength": 1,
                "maxLength": 150
            },
            "notes": {
                "type": ["string", "null"]
            },
            "items": {
                "type": "array",
                "minItems": 1,
                "items": {
                    "type": "object",
                    "properties": {
                        "product_id": { "type": "integer" },
                        "physical_stock": { "type": "number", "minimum": 0 },
                        "notes": { "type": ["string", "null"] }
                    },
                    "required": ["product_id", "physical_stock"],
                    "additionalProperties": false
                }
            }
        },
        "required": ["date", "warehouse_id", "inspector_name", "items"],
        "additionalProperties": false
    };

    createWaste = {
        "type": "object",
        "properties": {
            "date": {
                "type": "string",
                "minLength": 10,
                "maxLength": 10
            },
            "warehouse_id": { "type": "integer" },
            "product_id": { "type": "integer" },
            "quantity": {
                "type": "number",
                "minimum": 0.01
            },
            "reason": {
                "type": "string",
                "minLength": 1,
                "maxLength": 100
            },
            "status": {
                "type": "string",
                "enum": ["Dimusnahkan", "Retur Supplier", "Menunggu Approval"]
            },
            "notes": {
                "type": ["string", "null"]
            }
        },
        "required": ["date", "warehouse_id", "product_id", "quantity", "reason"],
        "additionalProperties": false
    };

    batchDelete = {
        "type": "object",
        "properties": {
            "ids": {
                "type": "array",
                "items": { "type": "integer" },
                "minItems": 1
            }
        },
        "required": ["ids"],
        "additionalProperties": false
    };
}

export default InventoryValidator;
