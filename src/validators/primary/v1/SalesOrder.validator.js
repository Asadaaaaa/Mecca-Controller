class SalesOrderValidator {
    create = {
        "type": "object",
        "properties": {
            "sales_order_number": { "type": "string" },
            "customer_id": { "type": "integer" },
            "quotation_id": { "type": ["integer", "null"] },
            "warehouse_id": { "type": ["integer", "null"] },
            "order_date": { "type": "string" },
            "subtotal": { "type": "number" },
            "discount_amount": { "type": "number" },
            "tax_amount": { "type": "number" },
            "grand_total": { "type": "number" },
            "status": { "type": "string" },
            "notes": { "type": ["string", "null"] },
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "product_id": { "type": "integer" },
                        "quantity": { "type": "number", "minimum": 0.01 },
                        "unit_price": { "type": "number", "minimum": 0 },
                        "discount_amount": { "type": "number" },
                        "tax_amount": { "type": "number" }
                    },
                    "required": ["product_id", "quantity"]
                },
                "minItems": 1
            }
        },
        "required": ["customer_id", "items"],
        "additionalProperties": false
    };

    update = {
        "type": "object",
        "properties": {
            "customer_id": { "type": "integer" },
            "quotation_id": { "type": ["integer", "null"] },
            "warehouse_id": { "type": ["integer", "null"] },
            "order_date": { "type": "string" },
            "subtotal": { "type": "number" },
            "discount_amount": { "type": "number" },
            "tax_amount": { "type": "number" },
            "grand_total": { "type": "number" },
            "status": { "type": "string" },
            "notes": { "type": ["string", "null"] },
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "product_id": { "type": "integer" },
                        "quantity": { "type": "number", "minimum": 0.01 },
                        "unit_price": { "type": "number", "minimum": 0 },
                        "discount_amount": { "type": "number" },
                        "tax_amount": { "type": "number" }
                    },
                    "required": ["product_id", "quantity"]
                }
            }
        },
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

export default SalesOrderValidator;
