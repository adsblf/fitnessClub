<?php

namespace Database\Seeders;

use App\Models\Administrator;
use App\Models\Client;
use App\Models\ClientCard;
use App\Models\Membership;
use App\Models\MembershipType;
use App\Models\Payment;
use App\Models\Person;
use App\Models\Role;
use App\Models\Trainer;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TestDataSeeder extends Seeder
{
    private array $lastM = [
        'Иванов', 'Петров', 'Сидоров', 'Кузнецов', 'Смирнов',
        'Попов', 'Михайлов', 'Новиков', 'Козлов', 'Морозов',
        'Волков', 'Алексеев', 'Лебедев', 'Семёнов', 'Егоров',
        'Павлов', 'Степанов', 'Соколов', 'Михеев', 'Орлов',
    ];

    private array $lastF = [
        'Иванова', 'Петрова', 'Сидорова', 'Кузнецова', 'Смирнова',
        'Попова', 'Михайлова', 'Новикова', 'Козлова', 'Морозова',
        'Волкова', 'Алексеева', 'Лебедева', 'Семёнова', 'Егорова',
        'Павлова', 'Степанова', 'Соколова', 'Михеева', 'Орлова',
    ];

    private array $firstM = [
        'Александр', 'Дмитрий', 'Максим', 'Сергей', 'Андрей',
        'Алексей', 'Артём', 'Илья', 'Кирилл', 'Михаил',
        'Никита', 'Роман', 'Егор', 'Вадим', 'Денис',
        'Евгений', 'Антон', 'Олег', 'Константин', 'Павел',
    ];

    private array $firstF = [
        'Анастасия', 'Мария', 'Екатерина', 'Юлия', 'Ольга',
        'Наталья', 'Татьяна', 'Елена', 'Светлана', 'Ирина',
        'Алина', 'Валерия', 'Виктория', 'Дарья', 'Ксения',
        'Полина', 'Варвара', 'Яна', 'Людмила', 'Галина',
    ];

    private array $patronM = [
        'Александрович', 'Дмитриевич', 'Сергеевич', 'Андреевич', 'Алексеевич',
        'Михайлович', 'Николаевич', 'Владимирович', 'Васильевич', 'Иванович',
        'Борисович', 'Олегович', 'Антонович', 'Евгеньевич', 'Романович',
    ];

    private array $patronF = [
        'Александровна', 'Дмитриевна', 'Сергеевна', 'Андреевна', 'Алексеевна',
        'Михайловна', 'Николаевна', 'Владимировна', 'Васильевна', 'Ивановна',
        'Борисовна', 'Олеговна', 'Антоновна', 'Евгеньевна', 'Романовна',
    ];

    private array $streets = [
        'Ленина', 'Маркса', 'Мира', 'Победы', 'Октябрьская',
        'Гагарина', 'Пушкина', 'Тюленева', 'Масленникова', 'Интернациональная',
    ];

    private array $goals = [
        'Похудение',
        'Набор мышечной массы',
        'Поддержание формы',
        'Улучшение гибкости',
        'Восстановление после травмы',
        'Общее оздоровление',
    ];

    private array $payMethods = ['cash', 'card_terminal', 'online_sbp'];

    public function run(): void
    {
        $today = Carbon::create(2026, 6, 12);
        $types = $this->createMembershipTypes();

        $adminPerson = Person::whereHas('user', fn($q) => $q->where('email', 'admin@fitclub.ru'))
            ->firstOrFail();

        $this->ensureClient1($types, $adminPerson);

        $index = 1;
        $index = $this->seedMonth(2026, 3, 27, 27, $types, $adminPerson, $index);
        $index = $this->seedMonth(2026, 4, 40, 35, $types, $adminPerson, $index);
        $index = $this->seedMonth(2026, 5, 33, 32, $types, $adminPerson, $index);
        $index = $this->seedMonth(2026, 6, 19, 19, $types, $adminPerson, $index, 12);

        $this->command->info('Тестовые данные созданы для марта, апреля, мая и июня.');
    }

    private function createMembershipTypes(): array
    {
        return [
            'standard' => MembershipType::firstOrCreate(
                ['name' => 'Стандарт 1 мес.'],
                [
                    'price'         => 3000.00,
                    'visit_limit'   => 12,
                    'duration_days' => 30,
                    'description'   => '12 посещений в течение месяца',
                ]
            ),
            'premium' => MembershipType::firstOrCreate(
                ['name' => 'Премиум 3 мес.'],
                [
                    'price'         => 7500.00,
                    'visit_limit'   => 36,
                    'duration_days' => 90,
                    'description'   => '36 посещений, заморозка до 14 дней',
                ]
            ),
            'unlimited' => MembershipType::firstOrCreate(
                ['name' => 'Безлимит 12 мес.'],
                [
                    'price'         => 24000.00,
                    'visit_limit'   => 999,
                    'duration_days' => 365,
                    'description'   => 'Неограниченное количество посещений на год',
                ]
            ),
        ];
    }

    private function ensureClient1(array $types, Person $adminPerson): void
    {
        $person = Person::whereHas('user', fn($q) => $q->where('email', 'client1@fitclub.ru'))
            ->firstOrFail();

        $client = Client::firstOrCreate(
            ['person_id' => $person->id],
            [
                'registration_date' => Carbon::create(2026, 3, 5)->toDateString(),
                'status'            => 'active',
            ]
        );

        ClientCard::firstOrCreate(
            ['client_id' => $client->person_id],
            [
                'training_goal'         => 'Поддержание формы',
                'current_weight'        => 78.0,
                'height'                => 180.0,
                'last_measurement_date' => Carbon::create(2026, 3, 5)->toDateString(),
            ]
        );

        if (!Membership::where('client_id', $client->person_id)->exists()) {
            $this->createMembership(
                $client,
                $types['standard'],
                $adminPerson,
                Carbon::create(2026, 3, 5)
            );
        }
    }

    private function seedMonth(
        int $year,
        int $month,
        int $clientCount,
        int $membershipCount,
        array $types,
        Person $adminPerson,
        int $startIndex,
        int $endDay = null
    ): int {
        $firstDay = Carbon::create($year, $month, 1);
        $lastDay = Carbon::create($year, $month, $endDay ?: $firstDay->daysInMonth);
        $days = $firstDay->diffInDays($lastDay) + 1;
        $membershipTypes = [$types['standard'], $types['premium'], $types['unlimited']];

        for ($i = 0; $i < $clientCount; $i++) {
            $dayOffset = (int) round($i * ($days - 1) / max(1, $clientCount - 1));
            $registrationDate = $firstDay->copy()->addDays($dayOffset);
            $isFemale = ($i % 2 === 0);
            $fullName = $this->buildFullName($i, $isFemale);
            $email = 'test' . str_pad($startIndex + $i, 3, '0', STR_PAD_LEFT) . '@fitclub.ru';
            $phone = '+7-900-' . str_pad(($startIndex + $i) % 1000, 3, '0', STR_PAD_LEFT) . '-';
            $phone .= str_pad((($startIndex + $i) * 7) % 100, 2, '0', STR_PAD_LEFT) . '-';
            $phone .= str_pad((($startIndex + $i) * 3) % 100, 2, '0', STR_PAD_LEFT);

            $birthDate = Carbon::create(1985 + ($i % 18), (($i * 3) % 12) + 1, (($i * 7) % 25) + 1)->toDateString();
            $client = $this->makeClient(
                $email,
                $fullName,
                $phone,
                $birthDate,
                $registrationDate->toDateString()
            );

            if ($i < $membershipCount) {
                $membershipType = $membershipTypes[$i % count($membershipTypes)];
                $this->createMembership($client, $membershipType, $adminPerson, $registrationDate);
            }
        }

        return $startIndex + $clientCount;
    }

    private function makeClient(string $email, string $fullName, string $phone, string $birthDate, string $registrationDate): Client
    {
        $login = Str::before($email, '@');

        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'login'    => $login,
                'password' => Hash::make('password'),
            ]
        );

        if (!$user->roles()->where('name', 'client')->exists()) {
            $user->roles()->attach(Role::where('name', 'client')->firstOrFail());
        }

        $person = Person::firstOrCreate(
            ['user_id' => $user->id],
            [
                'full_name'  => $fullName,
                'phone'      => $phone,
                'birth_date' => $birthDate,
            ]
        );

        $client = Client::firstOrCreate(
            ['person_id' => $person->id],
            [
                'registration_date' => $registrationDate,
                'status'            => 'active',
            ]
        );

        ClientCard::firstOrCreate(
            ['client_id' => $client->person_id],
            [
                'training_goal'         => $this->goals[$client->person_id % count($this->goals)],
                'current_weight'        => 70.0 + ($client->person_id % 20),
                'height'                => 165.0 + ($client->person_id % 20),
                'last_measurement_date' => $registrationDate,
            ]
        );

        return $client;
    }

    private function createMembership(Client $client, MembershipType $type, Person $adminPerson, Carbon $saleDate): void
    {
        if (Membership::where('client_id', $client->person_id)
            ->where('membership_type_id', $type->id)
            ->exists()) {
            return;
        }

        $endDate = $saleDate->copy()->addDays($type->duration_days);

        $membership = Membership::create([
            'membership_number'  => Membership::generateNumber(),
            'client_id'          => $client->person_id,
            'membership_type_id' => $type->id,
            'administrator_id'   => $adminPerson->id,
            'start_date'         => $saleDate->toDateString(),
            'end_date'           => $endDate->toDateString(),
            'remaining_visits'   => $type->visit_limit,
            'status'             => 'active',
        ]);

        Payment::create([
            'client_id'      => $client->person_id,
            'membership_id'  => $membership->id,
            'amount'         => $type->price,
            'paid_at'        => $saleDate->copy()->setTime(10, 0),
            'payment_method' => $this->payMethods[$client->person_id % count($this->payMethods)],
            'status'         => 'success',
        ]);
    }

    private function buildFullName(int $index, bool $isFemale): string
    {
        $lastName = $isFemale
            ? $this->lastF[$index % count($this->lastF)]
            : $this->lastM[$index % count($this->lastM)];
        $firstName = $isFemale
            ? $this->firstF[$index % count($this->firstF)]
            : $this->firstM[$index % count($this->firstM)];
        $patronymic = $isFemale
            ? $this->patronF[$index % count($this->patronF)]
            : $this->patronM[$index % count($this->patronM)];

        return "$lastName $firstName $patronymic";
    }
}
