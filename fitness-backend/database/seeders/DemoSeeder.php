<?php

namespace Database\Seeders;

use App\Models\Administrator;
use App\Models\Booking;
use App\Models\Client;
use App\Models\ClientCard;
use App\Models\GroupSession;
use App\Models\Hall;
use App\Models\Membership;
use App\Models\MembershipType;
use App\Models\Payment;
use App\Models\Person;
use App\Models\PersonalSession;
use App\Models\Role;
use App\Models\Session;
use App\Models\Trainer;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Заполняет БД реалистичными демо-данными.
 * Запуск: php artisan db:seed --class=DemoSeeder
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. Залы ────────────────────────────────────
        $halls = [
            Hall::create(['number' => '1', 'type' => 'gym',        'capacity' => 40]),
            Hall::create(['number' => '2', 'type' => 'group',      'capacity' => 25]),
            Hall::create(['number' => '3', 'type' => 'group',      'capacity' => 15]),
            Hall::create(['number' => '4', 'type' => 'functional', 'capacity' => 12]),
        ];

        // ── 2. Типы абонементов ────────────────────────
        $types = [
            MembershipType::create([
                'name'           => 'Разовое посещение',
                'price'          => 500.00,
                'visit_limit'    => 1,
                'duration_days'  => 1,
                'description'    => 'Одно посещение тренажёрного зала',
            ]),
            MembershipType::create([
                'name'           => 'Стандарт 1 мес.',
                'price'          => 3000.00,
                'visit_limit'    => 12,
                'duration_days'  => 30,
                'description'    => '12 посещений в течение месяца',
            ]),
            MembershipType::create([
                'name'           => 'Премиум 3 мес.',
                'price'          => 7500.00,
                'visit_limit'    => 36,
                'duration_days'  => 90,
                'description'    => '36 посещений, заморозка до 14 дней',
            ]),
            MembershipType::create([
                'name'           => 'Безлимит 12 мес.',
                'price'          => 24000.00,
                'visit_limit'    => 999,
                'duration_days'  => 365,
                'description'    => 'Неограниченное количество посещений на год',
            ]),
        ];

        // ── 3. Владелец ────────────────────────────────
        $this->createUserWithRole('owner@fitclub.ru', 'Петров Алексей Сергеевич', 'owner');

        // ── 4. Администратор ───────────────────────────
        $adminPerson = $this->createUserWithRole('admin@fitclub.ru', 'Смирнова Ирина Владимировна', 'admin');
        Administrator::create([
            'person_id' => $adminPerson->id,
            'position'  => 'Старший администратор',
        ]);

        // ── 5. Тренеры ────────────────────────────────
        $trainerPerson1 = $this->createUserWithRole('trainer1@fitclub.ru', 'Козлов Дмитрий Андреевич', 'trainer');
        $trainer1 = Trainer::create([
            'person_id'       => $trainerPerson1->id,
            'specialization'  => 'Кроссфит, Функциональный тренинг',
            'contact_phone'   => '+7-900-111-22-33',
            'description'     => 'Сертифицированный тренер CrossFit Level 2. Опыт 5 лет.',
        ]);

        $trainerPerson2 = $this->createUserWithRole('trainer2@fitclub.ru', 'Новикова Елена Игоревна', 'trainer');
        $trainer2 = Trainer::create([
            'person_id'       => $trainerPerson2->id,
            'specialization'  => 'Йога, Пилатес, Растяжка',
            'contact_phone'   => '+7-900-444-55-66',
            'description'     => 'Инструктор йоги, стаж 8 лет. Сертификат Yoga Alliance RYT-500.',
        ]);

        // ── 6. Клиенты ────────────────────────────────
        $clients = [];
        $clientsData = [
            ['client1@fitclub.ru', 'Иванов Иван Петрович',     '1990-05-15', '+7-900-100-00-01'],
            ['client2@fitclub.ru', 'Сидорова Мария Алексеевна', '1985-11-23', '+7-900-100-00-02'],
            ['client3@fitclub.ru', 'Кузнецов Артём Дмитриевич', '1998-03-08', '+7-900-100-00-03'],
        ];

        foreach ($clientsData as $i => [$email, $name, $birth, $phone]) {
            $person = $this->createUserWithRole($email, $name, 'client', $phone, $birth);
            $client = Client::create([
                'person_id'         => $person->id,
                'registration_date' => now()->subDays(rand(30, 180))->toDateString(),
                'status'            => 'active',
            ]);

            // Клиентская карточка
            ClientCard::create([
                'client_id'      => $client->person_id,
                'training_goal'  => ['Похудение', 'Набор массы', 'Поддержание формы'][$i],
                'current_weight' => [82.5, 58.0, 75.3][$i],
                'height'         => [178.0, 165.0, 182.0][$i],
            ]);

            $clients[] = $client;
        }

        // ── 7. Абонементы ──────────────────────────────
        $memberships = [];
        foreach ($clients as $i => $client) {
            $type = $types[$i + 1]; // Стандарт, Премиум, Безлимит

            $membership = Membership::create([
                'membership_number'  => Membership::generateNumber(),
                'client_id'          => $client->person_id,
                'membership_type_id' => $type->id,
                'administrator_id'   => $adminPerson->id,
                'start_date'         => now()->subDays(15)->toDateString(),
                'end_date'           => now()->addDays($type->duration_days - 15)->toDateString(),
                'remaining_visits'   => $type->visit_limit - rand(1, 5),
                'status'             => 'active',
            ]);

            // Оплата за абонемент
            Payment::create([
                'client_id'      => $client->person_id,
                'membership_id'  => $membership->id,
                'amount'         => $type->price,
                'paid_at'        => now()->subDays(15),
                'payment_method' => ['online_sbp', 'card_terminal', 'cash'][$i],
                'status'         => 'success',
            ]);

            $memberships[] = $membership;
        }

        // ── 8. Групповые занятия (расписание на неделю) ─
        $groupClasses = [
            ['name' => 'Кроссфит',       'trainer' => $trainer1, 'hall' => $halls[3], 'difficulty' => 'Высокий',  'max' => 12, 'hour' => 10],
            ['name' => 'Йога',           'trainer' => $trainer2, 'hall' => $halls[2], 'difficulty' => 'Начальный', 'max' => 15, 'hour' => 12],
            ['name' => 'Пилатес',        'trainer' => $trainer2, 'hall' => $halls[2], 'difficulty' => 'Средний',  'max' => 15, 'hour' => 18],
            ['name' => 'Функциональный', 'trainer' => $trainer1, 'hall' => $halls[3], 'difficulty' => 'Средний',  'max' => 12, 'hour' => 19],
        ];

        $sessions = [];
        foreach ($groupClasses as $gc) {
            // Создаём на 3 дня вперёд
            for ($day = 0; $day < 3; $day++) {
                $startsAt = now()->addDays($day)->setHour($gc['hour'])->setMinute(0)->setSecond(0);

                $session = Session::create([
                    'hall_id'    => $gc['hall']->id,
                    'trainer_id' => $gc['trainer']->person_id,
                    'starts_at'  => $startsAt,
                    'ends_at'    => $startsAt->copy()->addMinutes(60),
                    'status'     => 'scheduled',
                    'type'       => 'group',
                ]);

                GroupSession::create([
                    'session_id'       => $session->id,
                    'name'             => $gc['name'],
                    'difficulty_level' => $gc['difficulty'],
                    'max_participants' => $gc['max'],
                ]);

                $sessions[] = $session;
            }
        }

        // ── 9. Записи на занятия ───────────────────────
        // Клиент 1 записан на Кроссфит сегодня
        Booking::create([
            'client_id'  => $clients[0]->person_id,
            'session_id' => $sessions[0]->id,  // Кроссфит сегодня
            'status'     => 'confirmed',
        ]);

        // Клиент 2 записана на Йогу сегодня
        Booking::create([
            'client_id'  => $clients[1]->person_id,
            'session_id' => $sessions[3]->id,  // Йога сегодня
            'status'     => 'booked',
        ]);

        // Клиент 3 записан на Функциональный завтра
        Booking::create([
            'client_id'  => $clients[2]->person_id,
            'session_id' => $sessions[10]->id, // Функциональный завтра
            'status'     => 'booked',
        ]);

        // ── 10. Посещения (вчерашние) ──────────────────
        $yesterday = now()->subDay();

        Visit::create([
            'client_id'        => $clients[0]->person_id,
            'session_id'       => null,
            'administrator_id' => $adminPerson->id,
            'membership_id'    => $memberships[0]->id,
            'visited_at'       => $yesterday->copy()->setHour(10),
            'status'           => 'visited',
        ]);

        Visit::create([
            'client_id'        => $clients[1]->person_id,
            'session_id'       => null,
            'administrator_id' => $adminPerson->id,
            'membership_id'    => $memberships[1]->id,
            'visited_at'       => $yesterday->copy()->setHour(14),
            'status'           => 'visited',
        ]);

        $this->command->info('Демо-данные успешно загружены!');
        $this->command->info('Аккаунты: admin@fitclub.ru / trainer1@fitclub.ru / client1@fitclub.ru');
        $this->command->info('Пароль для всех: password');
    }

    /**
     * Создать пользователя с ролью и профилем.
     */
    private function createUserWithRole(
        string $email,
        string $fullName,
        string $roleName,
        ?string $phone = null,
        ?string $birthDate = null
    ): Person {
        $user = User::create([
            'email'    => $email,
            'password' => Hash::make('password'),
        ]);

        $role = Role::where('name', $roleName)->first();
        $user->roles()->attach($role);

        return Person::create([
            'user_id'    => $user->id,
            'full_name'  => $fullName,
            'phone'      => $phone,
            'birth_date' => $birthDate,
        ]);
    }
}
