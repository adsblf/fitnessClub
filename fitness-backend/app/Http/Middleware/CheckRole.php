<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware для проверки роли пользователя.
 *
 * Использование в маршрутах:
 *   ->middleware('role:admin')          — только админ
 *   ->middleware('role:admin,owner')    — админ ИЛИ владелец
 */
class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Не авторизован'], 401);
        }

        // Проверяем, есть ли у пользователя хотя бы одна из указанных ролей
        $hasRole = $user->roles()->whereIn('name', $roles)->exists();

        if (!$hasRole) {
            return response()->json(['message' => 'Доступ запрещён'], 403);
        }

        return $next($request);
    }
}
