<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('slug', 50)->unique();
            $table->boolean('is_returnable')->default(true);
            $table->string('icon', 10)->nullable();
            $table->timestamps();
        });

        // Сеем три стандартные категории
        DB::table('product_categories')->insert([
            ['name' => 'Аксессуары', 'slug' => 'accessories', 'is_returnable' => true,  'icon' => '🎽', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Питание',    'slug' => 'food',         'is_returnable' => false, 'icon' => '🥤', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Услуги',     'slug' => 'services',     'is_returnable' => false, 'icon' => '💆', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('product_categories');
    }
};
