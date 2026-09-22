class DeliveryValidator {
    create = {
        "type": "object",
        "properties": {
            "delivery_number": { "type": "string" },
            "sales_order_id": { "type": "integer" },
            "warehouse_id": { "type": ["integer", "null"] },
            "delivery_date": { "type": "string" },
            "courier_fleet": { "type": ["string", "null"] },
            "tracking_number": { "type": ["string", "null"] },
            "status": { "type": "string" },
            "notes": { "type": ["string", "null"] },
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "sales_order_item_id": { "type": "integer" },
                        "product_id": { "type": "integer" },
                        "quantity": { "type": "number", "minimum": 0.01 }
                    },
                    "required": ["quantity"]
                },
                "minItems": 1
            }
        },
        "required": ["sales_order_id", "items"],
        "additionalProperties": false
    };

    update = {
        "type": "object",
        "properties": {
            "warehouse_id": { "type": ["integer", "null"] },
            "delivery_date": { "type": "string" },
            "courier_fleet": { "type": ["string", "null"] },
            "tracking_number": { "type": ["string", "null"] },
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

export default DeliveryValidator;
