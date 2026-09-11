class UserValidator {
    create = {
        "type": "object",
        "properties": {
            "name": {
                "type": "string",
                "minLength": 1,
                "maxLength": 100
            },
            "email": {
                "type": "string",
                "minLength": 3,
                "maxLength": 150
            },
            "username": {
                "type": "string",
                "minLength": 3,
                "maxLength": 50
            },
            "password": {
                "type": "string",
                "minLength": 6,
                "maxLength": 100
            },
            "status": {
                "type": "string",
                "enum": ["active", "inactive", "suspended"]
            },
            "role_ids": {
                "type": "array",
                "items": {
                    "type": "integer"
                }
            }
        },
        "required": ["name", "email", "username", "password"],
        "additionalProperties": false
    };

    update = {
        "type": "object",
        "properties": {
            "name": {
                "type": "string",
                "minLength": 1,
                "maxLength": 100
            },
            "email": {
                "type": "string",
                "minLength": 3,
                "maxLength": 150
            },
            "username": {
                "type": "string",
                "minLength": 3,
                "maxLength": 50
            },
            "password": {
                "type": ["string", "null"],
                "minLength": 6,
                "maxLength": 100
            },
            "status": {
                "type": "string",
                "enum": ["active", "inactive", "suspended"]
            },
            "role_ids": {
                "type": "array",
                "items": {
                    "type": "integer"
                }
            }
        },
        "additionalProperties": false
    };
}

export default UserValidator;
