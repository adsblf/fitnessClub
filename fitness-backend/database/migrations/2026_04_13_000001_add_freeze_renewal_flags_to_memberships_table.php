<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('memberships', function (Blueprint $table) {
            $table->boolean('has_been_frozen')->default(false)->after('frozen_until');
            $table->boolean('is_renewal')->default(false)->after('has_been_frozen');
        });
    }

    public function down(): void
    {
        Schema::table('memberships', function (Blueprint $table) {
            $table->dropColumn(['has_been_frozen', 'is_renewal']);
        });
    }
};
