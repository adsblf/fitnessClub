<?php

namespace Database\Seeders;

use App\Models\Administrator;
use App\Models\Client;
use App\Models\Person;
use App\Models\Role;
use App\Models\Trainer;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $ownerPerson = $this->createUserWithRole(
            'owner@fitclub.ru',
            'Петров Алексей Сергеевич',
            'owner',
            '+7-900-200-00-01',
            '1980-01-10'
        );

        $adminPerson = $this->createUserWithRole(
            'admin@fitclub.ru',
            'Смирнова Ирина Владимировна',
            'admin',
            '+7-900-200-00-02',
            '1985-04-15'
        );

        Administrator::firstOrCreate(
            ['person_id' => $adminPerson->id],
            ['position' => 'Старший администратор']
        );

        $trainerPerson = $this->createUserWithRole(
            'trainer1@fitclub.ru',
            'Козлов Дмитрий Андреевич',
            'trainer',
            '+7-900-200-00-03',
            '1990-06-05'
        );

        Trainer::firstOrCreate(
            ['person_id' => $trainerPerson->id],
            [
                'specialization' => 'Кроссфит, Функциональный тренинг',
                'contact_phone'  => '+7-900-200-00-03',
                'description'    => 'Сертифицированный тренер CrossFit. Опыт 5 лет.',
            ]
        );

        $client1Person = $this->createUserWithRole(
            'client1@fitclub.ru',
            'Иванов Иван Петрович',
            'client',
            '+7-900-200-00-04',
            '1993-08-20'
        );

        Client::firstOrCreate(
            ['person_id' => $client1Person->id],
            [
                'registration_date' => now()->toDateString(),
                'status'            => 'active',
            ]
        );

        $client2Person = $this->createUserWithRole(
            'client2@fitclub.ru',
            'Петрова Анна Сергеевна',
            'client',
            '+7-900-200-00-05',
            '1995-11-25'
        );

        Client::firstOrCreate(
            ['person_id' => $client2Person->id],
            [
                'registration_date' => now()->toDateString(),
                'status'            => 'active',
            ]
        );

        $this->command->info('Демо-данные созданы: admin@fitclub.ru, owner@fitclub.ru, trainer1@fitclub.ru, client1@fitclub.ru, client2@fitclub.ru');
    }

    private function createUserWithRole(
        string $email,
        string $fullName,
        string $roleName,
        ?string $phone = null,
        ?string $birthDate = null
    ): Person {
        $login = Str::before($email, '@');

        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'login'    => $login,
                'password' => Hash::make('password'),
            ]
        );

        if (!$user->roles()->where('name', $roleName)->exists()) {
            $user->roles()->attach(Role::where('name', $roleName)->firstOrFail());
        }

        $person = Person::firstOrCreate(
            ['user_id' => $user->id],
            [
                'full_name'  => $fullName,
                'phone'      => $phone,
                'birth_date' => $birthDate,
            ]
        );

        $person->update([
            'full_name'  => $fullName,
            'phone'      => $phone,
            'birth_date' => $birthDate,
        ]);

        return $person;
    }
}
