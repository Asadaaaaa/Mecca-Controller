class PaymentValidator {
    create = {
        "type": "object",
        "properties": {
            "payment_number": { "type": "string" },
            "customer_id": { "type": "integer" },
            "payment_date": { "type": "string" },
            "amount": { "type": "number", "minimum": 0.01 },
            "payment_method": { "type": "string" },
            "bank_account": { "type": ["string", "null"] },
            "reference_number": { "type": ["string", "null"] },
            "status": { "type": "string" },
            "notes": { "type": ["string", "null"] },
            "allocations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "invoice_id": { "type": "integer" },
                        "allocated_amount": { "type": "number", "minimum": 0.01 }
                    },
                    "required": ["invoice_id", "allocated_amount"]
                }
            }
        },
        "required": ["customer_id", "amount"],
        "additionalProperties": false
    };

    update = {
        "type": "object",
        "properties": {
            "payment_date": { "type": "string" },
            "payment_method": { "type": "string" },
            "bank_account": { "type": ["string", "null"] },
            "reference_number": { "type": ["string", "null"] },
            "status": { "type": "string" },
            "notes": { "type": ["string", "null"] }
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

export default PaymentValidator;
