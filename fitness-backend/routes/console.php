<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Models\Session;
use Carbon\Carbon;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
 * Автозавершение прошедших занятий каждые 30 минут.
 * Запустить планировщик: php artisan schedule:work
 */
Schedule::call(function () {
    Session::where('status', 'scheduled')
        ->where('ends_at', '<', Carbon::now())
        ->update(['status' => 'completed']);
})->everyThirtyMinutes();
