class AuthValidator {
    login = {
        "type": "object",
        "properties": {
            "identity": {
                "type": "string",
                "minLength": 1,
                "maxLength": 150,
                "nullable": false
            },
            "password": {
                "type": "string",
                "minLength": 1,
                "maxLength": 100,
                "nullable": false
            }
        },
        "required": [
            "identity", "password"
        ],
        "additionalProperties": false
    };

    refreshToken = {
        "type": "object",
        "properties": {
            "refreshToken": {
                "type": "string",
                "minLength": 10,
                "nullable": false
            }
        },
        "required": [
            "refreshToken"
        ],
        "additionalProperties": false
    };
}

export default AuthValidator;