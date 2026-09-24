class InvoiceValidator {
    create = {
        "type": "object",
        "properties": {
            "invoice_number": { "type": "string" },
            "customer_id": { "type": ["integer", "null"] },
            "delivery_id": { "type": ["integer", "null"] },
            "sales_order_id": { "type": ["integer", "null"] },
            "invoice_date": { "type": "string" },
            "due_date": { "type": "string" },
            "subtotal": { "type": "number" },
            "discount_amount": { "type": "number" },
            "tax_amount": { "type": "number" },
            "status": { "type": "string" },
            "notes": { "type": ["string", "null"] },
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "product_id": { "type": "integer" },
                        "delivery_id": { "type": ["integer", "null"] },
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

    update = {
        "type": "object",
        "properties": {
            "status": { "type": "string" },
            "notes": { "type": ["string", "null"] },
            "due_date": { "type": "string" },
            "paid_amount": { "type": "number" }
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

export default InvoiceValidator;
