<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Здесь можно настроить, какие домены могут обращаться к вашему API.
    | Для разработки фронтенда обычно разрешают localhost и порт dev-сервера.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter([
        'http://localhost:5173',
        env('FRONTEND_URL'),
    ]),

    'allowed_origins_patterns' => [
        '#^https://.*\.up\.railway\.app$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true, // важно для cookies/Sanctum
];
