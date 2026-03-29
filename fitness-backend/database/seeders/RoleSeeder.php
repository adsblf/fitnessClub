<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;

/**
 * Заполняет таблицу roles четырьмя ролями системы.
 * Запуск: php artisan db:seed --class=RoleSeeder
 */
class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['name' => 'client',  'description' => 'Клиент — конечный потребитель услуг'],
            ['name' => 'trainer', 'description' => 'Тренер — проведение занятий'],
            ['name' => 'admin',   'description' => 'Администратор — оперативное управление клубом'],
            ['name' => 'owner',   'description' => 'Владелец — стратегическое управление'],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(['name' => $role['name']], $role);
        }
    }
}
