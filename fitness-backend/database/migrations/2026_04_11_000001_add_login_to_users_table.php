<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Новый логин для входа. Сначала nullable, уникальный.
            $table->string('login', 100)->nullable()->unique()->after('email');
        });

        // Заполним логины для существующих пользователей, если они пустые
        if (Schema::hasTable('users')) {
            \Illuminate\Support\Facades\DB::table('users')
                ->whereNull('login')
                ->orWhere('login', '')
                ->get()
                ->each(function ($u) {
                    $generated = 'user.' . strtolower(\Illuminate\Support\Str::random(8));
                    // Попробуем проставить уникальный логин — если конфликт, сгенерируем снова
                    while (\Illuminate\Support\Facades\DB::table('users')->where('login', $generated)->exists()) {
                        $generated = 'user.' . strtolower(\Illuminate\Support\Str::random(8));
                    }
                    \Illuminate\Support\Facades\DB::table('users')->where('id', $u->id)->update(['login' => $generated]);
                });
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('login');
        });
    }
};

