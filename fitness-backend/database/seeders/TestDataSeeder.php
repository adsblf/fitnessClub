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
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Наполняет БД реалистичными тестовыми данными:
 * - 2 дополнительных тренера, 1 администратор
 * - 100 клиентов (90% с паспортными данными, все из Омска)
 * - Клиенты и продажи абонементов: 01.03.2026 – 13.04.2026
 * - Групповые занятия: 01.03.2026 – 21.04.2026
 *
 * Запуск: php artisan db:seed --class=TestDataSeeder
 */
class TestDataSeeder extends Seeder
{
    // ── Списки омских улиц ─────────────────────────────────────────────────
    private array $streets = [
        'Ленина', 'Маркса', 'Мира', 'Победы', 'Октябрьская',
        'Гагарина', 'Пушкина', 'Тюленева', 'Масленникова', 'Интернациональная',
        'Красного Пути', 'Декабристов', 'Комарова', 'Береговая', 'Партизанская',
        'Нефтезаводская', 'Химиков', 'Энергетиков', 'Строителей', 'Молодёжная',
        'Архитекторов', 'Конева', 'Жукова', 'Рокоссовского', 'Лукашевича',
        'Красный Путь', 'Лизы Чайкиной', 'Фрунзе', 'Богдана Хмельницкого',
    ];

    // ── Паспортные органы Омска ────────────────────────────────────────────
    private array $passportOffices = [
        'Отделом УМВД России по ЦАО г. Омска',
        'Отделом УМВД России по САО г. Омска',
        'Отделом УМВД России по КАО г. Омска',
        'Отделом УМВД России по ОАО г. Омска',
        'Отделом УМВД России по Советскому АО г. Омска',
        'УФМС России по Омской области в ЦАО г. Омска',
        'УФМС России по Омской области в КАО г. Омска',
        'УФМС России по Омской области в САО г. Омска',
    ];

    // ── Коды подразделений (550-yyy — Омск) ───────────────────────────────
    private array $deptCodes = [
        '550-001', '550-002', '550-003', '550-004', '550-005',
        '550-006', '550-007', '550-008', '550-009', '550-010',
        '550-011', '550-012', '550-013',
    ];

    // ── Фамилии ───────────────────────────────────────────────────────────
    private array $lastM = [
        'Иванов', 'Петров', 'Сидоров', 'Кузнецов', 'Смирнов',
        'Попов', 'Михайлов', 'Новиков', 'Козлов', 'Морозов',
        'Волков', 'Алексеев', 'Лебедев', 'Семёнов', 'Егоров',
        'Павлов', 'Степанов', 'Соколов', 'Михеев', 'Орлов',
        'Фёдоров', 'Матвеев', 'Зайцев', 'Бобров', 'Тихонов',
        'Громов', 'Крылов', 'Никитин', 'Дорофеев', 'Анисимов',
        'Борисов', 'Захаров', 'Коновалов', 'Мельников', 'Виноградов',
    ];
    private array $lastF = [
        'Иванова', 'Петрова', 'Сидорова', 'Кузнецова', 'Смирнова',
        'Попова', 'Михайлова', 'Новикова', 'Козлова', 'Морозова',
        'Волкова', 'Алексеева', 'Лебедева', 'Семёнова', 'Егорова',
        'Павлова', 'Степанова', 'Соколова', 'Михеева', 'Орлова',
        'Фёдорова', 'Матвеева', 'Зайцева', 'Боброва', 'Тихонова',
        'Громова', 'Крылова', 'Никитина', 'Дорофеева', 'Анисимова',
        'Борисова', 'Захарова', 'Коновалова', 'Мельникова', 'Виноградова',
    ];

    // ── Имена ─────────────────────────────────────────────────────────────
    private array $firstM = [
        'Александр', 'Дмитрий', 'Максим', 'Сергей', 'Андрей',
        'Алексей', 'Артём', 'Илья', 'Кирилл', 'Михаил',
        'Никита', 'Роман', 'Егор', 'Вадим', 'Денис',
        'Евгений', 'Антон', 'Олег', 'Константин', 'Павел',
        'Тимур', 'Виктор', 'Игорь', 'Владимир', 'Николай',
    ];
    private array $firstF = [
        'Анастасия', 'Мария', 'Екатерина', 'Юлия', 'Ольга',
        'Наталья', 'Татьяна', 'Елена', 'Светлана', 'Ирина',
        'Алина', 'Валерия', 'Виктория', 'Дарья', 'Ксения',
        'Полина', 'Варвара', 'Яна', 'Людмила', 'Галина',
        'Вероника', 'Надежда', 'Тамара', 'Зинаида', 'Нина',
    ];

    // ── Отчества ──────────────────────────────────────────────────────────
    private array $patronM = [
        'Александрович', 'Дмитриевич', 'Сергеевич', 'Андреевич', 'Алексеевич',
        'Михайлович', 'Николаевич', 'Владимирович', 'Васильевич', 'Иванович',
        'Борисович', 'Олегович', 'Антонович', 'Евгеньевич', 'Геннадьевич',
        'Романович', 'Витальевич', 'Максимович', 'Павлович', 'Игоревич',
    ];
    private array $patronF = [
        'Александровна', 'Дмитриевна', 'Сергеевна', 'Андреевна', 'Алексеевна',
        'Михайловна', 'Николаевна', 'Владимировна', 'Васильевна', 'Ивановна',
        'Борисовна', 'Олеговна', 'Антоновна', 'Евгеньевна', 'Геннадьевна',
        'Романовна', 'Витальевна', 'Максимовна', 'Павловна', 'Игоревна',
    ];

    // ── Цели тренировок ───────────────────────────────────────────────────
    private array $goals = [
        'Похудение',
        'Набор мышечной массы',
        'Поддержание формы',
        'Улучшение гибкости',
        'Восстановление после травмы',
        'Общее оздоровление',
        'Подготовка к соревнованиям',
        'Снятие стресса',
        'Улучшение выносливости',
        'Коррекция осанки',
    ];

    // ── Способы оплаты ────────────────────────────────────────────────────
    private array $payMethods = ['cash', 'card_terminal', 'online_sbp'];

    // ─────────────────────────────────────────────────────────────────────
    public function run(): void
    {
        $today = Carbon::create(2026, 4, 14);

        // ── Загружаем существующие залы и типы абонементов ────────────────
        $halls          = Hall::all()->keyBy('number');
        $membershipTypes = MembershipType::all()->values(); // [0..3]

        $hallGym        = $halls['1']; // тренажёрный, 40 мест
        $hallGroup1     = $halls['2']; // групповой,   25 мест
        $hallGroup2     = $halls['3']; // групповой,   15 мест
        $hallFunctional = $halls['4']; // функциональный, 12 мест

        // ── Существующий администратор (для ссылок в абонементах/посещениях)
        $adminPerson = Person::whereHas(
            'user', fn($q) => $q->where('email', 'admin@fitclub.ru')
        )->firstOrFail();

        // ════════════════════════════════════════════════════════════════════
        // 1. Два новых тренера
        // ════════════════════════════════════════════════════════════════════
        $t3Person = $this->makeUser(
            'trainer3@fitclub.ru', 'Степанов Иван Андреевич', 'trainer',
            '+7-913-321-11-22', '1988-06-15'
        );
        $trainer3 = Trainer::create([
            'person_id'      => $t3Person->id,
            'specialization' => 'Силовые тренировки, TRX, Кроссфит',
            'contact_phone'  => '+7-913-321-11-22',
            'description'    => 'Мастер спорта по тяжёлой атлетике. Сертифицированный инструктор TRX. Опыт 7 лет.',
        ]);

        $t4Person = $this->makeUser(
            'trainer4@fitclub.ru', 'Захарова Анастасия Петровна', 'trainer',
            '+7-913-765-44-88', '1993-02-28'
        );
        $trainer4 = Trainer::create([
            'person_id'      => $t4Person->id,
            'specialization' => 'Зумба, Аэробика, Стретчинг',
            'contact_phone'  => '+7-913-765-44-88',
            'description'    => 'Инструктор групповых программ, степ-аэробика, зумба. Сертификат AFAA. Стаж 4 года.',
        ]);

        // ════════════════════════════════════════════════════════════════════
        // 2. Дополнительный администратор
        // ════════════════════════════════════════════════════════════════════
        $admin2Person = $this->makeUser(
            'admin2@fitclub.ru', 'Воронова Ольга Сергеевна', 'admin',
            '+7-913-555-77-88', '1991-09-12'
        );
        Administrator::create([
            'person_id' => $admin2Person->id,
            'position'  => 'Администратор',
        ]);

        // ── Загружаем существующих тренеров (созданы в DemoSeeder) ────────
        $trainer1 = Trainer::whereHas(
            'person.user', fn($q) => $q->where('email', 'trainer1@fitclub.ru')
        )->firstOrFail();

        $trainer2 = Trainer::whereHas(
            'person.user', fn($q) => $q->where('email', 'trainer2@fitclub.ru')
        )->firstOrFail();

        // ════════════════════════════════════════════════════════════════════
        // 3. 100 клиентов
        // ════════════════════════════════════════════════════════════════════
        $regStart  = Carbon::create(2026, 3, 1);
        $regEnd    = Carbon::create(2026, 4, 13);
        $regSpread = $regStart->diffInDays($regEnd); // 43

        $clients        = [];
        $clientMemberships = []; // [person_id => Membership]

        for ($i = 1; $i <= 100; $i++) {
            $isFemale = ($i % 2 === 0);
            $idx      = $i - 1;

            $lastName  = $isFemale
                ? $this->lastF[$idx % count($this->lastF)]
                : $this->lastM[$idx % count($this->lastM)];
            $firstName = $isFemale
                ? $this->firstF[$idx % count($this->firstF)]
                : $this->firstM[$idx % count($this->firstM)];
            $patronymic = $isFemale
                ? $this->patronF[$idx % count($this->patronF)]
                : $this->patronM[$idx % count($this->patronM)];

            $fullName  = "$lastName $firstName $patronymic";
            $birthYear = 1975 + ($idx * 7 % 30); // 1975–2004
            $birthMonth = ($idx * 3 % 12) + 1;
            $birthDay   = ($idx * 11 % 28) + 1;
            $birthDate  = Carbon::create($birthYear, $birthMonth, $birthDay)->toDateString();

            $regDate = $regStart->copy()->addDays((int)round($idx * $regSpread / 99));

            $email = 'c' . str_pad($i, 3, '0', STR_PAD_LEFT) . '@fitclub.ru';
            $phone = '+7-913-' .
                str_pad(($i * 13 + 100) % 1000, 3, '0', STR_PAD_LEFT) . '-' .
                str_pad(($i * 7)  % 100, 2, '0', STR_PAD_LEFT) . '-' .
                str_pad(($i * 3)  % 100, 2, '0', STR_PAD_LEFT);

            $person = $this->makeUser($email, $fullName, 'client', $phone, $birthDate);

            // 90 из 100 получают паспортные данные (первые 90)
            if ($i <= 90) {
                $seriesSuffix = str_pad($i % 10, 2, '0', STR_PAD_LEFT);
                $passportNum  = str_pad(($i * 3719) % 1000000, 6, '0', STR_PAD_LEFT);
                $issuedYear   = 2010 + ($i % 12);
                $issuedMonth  = ($i % 11) + 1;
                $issuedDay    = ($i % 27) + 1;
                $street       = $this->streets[$idx % count($this->streets)];
                $house        = ($idx % 99) + 1;
                $apt          = ($idx % 200) + 1;

                $person->update([
                    'passport_series'          => '55' . $seriesSuffix,
                    'passport_number'          => $passportNum,
                    'passport_issued_at'       => Carbon::create($issuedYear, $issuedMonth, $issuedDay)->toDateString(),
                    'passport_issued_by'       => $this->passportOffices[$idx % count($this->passportOffices)],
                    'passport_department_code' => $this->deptCodes[$idx % count($this->deptCodes)],
                    'registration_address'     => "г. Омск, ул. {$street}, д. {$house}, кв. {$apt}",
                ]);
            }

            $client = Client::create([
                'person_id'         => $person->id,
                'registration_date' => $regDate->toDateString(),
                'status'            => 'active',
            ]);

            ClientCard::create([
                'client_id'             => $client->person_id,
                'training_goal'         => $this->goals[$idx % count($this->goals)],
                'current_weight'        => round(50 + ($idx % 50) + ($i * 0.3 % 10), 1),
                'height'                => $isFemale
                    ? round(158 + ($idx % 22), 1)
                    : round(168 + ($idx % 22), 1),
                'chest'                 => $isFemale ? round(83 + ($idx % 14), 1) : round(91 + ($idx % 14), 1),
                'waist'                 => round(66 + ($idx % 20), 1),
                'hips'                  => round(86 + ($idx % 20), 1),
                'last_measurement_date' => $regDate->toDateString(),
            ]);

            // ── Абонемент ─────────────────────────────────────────────────
            // Распределение: 20% разовые, 40% стандарт, 30% премиум, 10% безлимит
            if ($idx < 20)      $typeIdx = 0;
            elseif ($idx < 60)  $typeIdx = 1;
            elseif ($idx < 90)  $typeIdx = 2;
            else                $typeIdx = 3;

            $mType     = $membershipTypes[$typeIdx];
            $saleDate  = $regDate->copy();
            $endDate   = $saleDate->copy()->addDays($mType->duration_days);
            $usedVisits = ($typeIdx === 0) ? rand(0, 1) : rand(1, min(6, $mType->visit_limit));
            $remaining  = max(0, $mType->visit_limit - $usedVisits);
            $mStatus    = ($typeIdx === 3) ? 'active' : ($endDate->gt($today) ? 'active' : 'expired');

            $adminRef = ($idx % 2 === 0) ? $adminPerson : $admin2Person;

            $membership = Membership::create([
                'membership_number'  => Membership::generateNumber(),
                'client_id'          => $client->person_id,
                'membership_type_id' => $mType->id,
                'administrator_id'   => $adminRef->id,
                'start_date'         => $saleDate->toDateString(),
                'end_date'           => $endDate->toDateString(),
                'remaining_visits'   => $remaining,
                'status'             => $mStatus,
            ]);

            Payment::create([
                'client_id'      => $client->person_id,
                'membership_id'  => $membership->id,
                'amount'         => $mType->price,
                'paid_at'        => $saleDate->copy()->setTime(10 + ($idx % 8), ($idx % 4) * 15),
                'payment_method' => $this->payMethods[$idx % 3],
                'status'         => 'success',
            ]);

            $clients[]                                    = $client;
            $clientMemberships[$client->person_id] = $membership;
        }

        // ════════════════════════════════════════════════════════════════════
        // 4. Групповые занятия (расписание 01.03.2026 – 21.04.2026)
        // ════════════════════════════════════════════════════════════════════
        // Шаблон недели: [dayOfWeekIso => [[name, hall, trainer, hour, min, dur, difficulty, maxP], ...]]
        $schedule = [
            1 => [ // Понедельник
                ['Кроссфит',          $hallFunctional, $trainer1, 10, 0,  60, 'Высокий',   12],
                ['Йога',              $hallGroup2,     $trainer2, 12, 0,  60, 'Начальный', 15],
                ['Силовые тренировки',$hallGym,        $trainer3, 17, 0,  60, 'Средний',   20],
                ['Пилатес',           $hallGroup2,     $trainer2, 19, 0,  60, 'Средний',   15],
            ],
            2 => [ // Вторник
                ['TRX',               $hallFunctional, $trainer3, 11, 0,  45, 'Средний',   12],
                ['Зумба',             $hallGroup1,     $trainer4, 17, 0,  60, 'Начальный', 25],
                ['Аэробика',          $hallGroup1,     $trainer4, 19, 0,  60, 'Средний',   25],
            ],
            3 => [ // Среда
                ['Кроссфит',          $hallFunctional, $trainer1, 10, 0,  60, 'Высокий',   12],
                ['Йога',              $hallGroup2,     $trainer2, 12, 0,  60, 'Начальный', 15],
                ['Стретчинг',         $hallGroup2,     $trainer4, 18, 0,  60, 'Начальный', 15],
                ['Функциональный',    $hallFunctional, $trainer3, 19, 0,  60, 'Средний',   12],
            ],
            4 => [ // Четверг
                ['Силовые тренировки',$hallGym,        $trainer3, 11, 0,  60, 'Средний',   20],
                ['Стретчинг',         $hallGroup2,     $trainer4, 17, 0,  60, 'Начальный', 15],
                ['Зумба',             $hallGroup1,     $trainer4, 19, 0,  60, 'Начальный', 25],
            ],
            5 => [ // Пятница
                ['Кроссфит',          $hallFunctional, $trainer1, 10, 0,  60, 'Высокий',   12],
                ['TRX',               $hallFunctional, $trainer3, 13, 0,  45, 'Средний',   12],
                ['Аэробика',          $hallGroup1,     $trainer4, 18, 0,  60, 'Средний',   25],
                ['Пилатес',           $hallGroup2,     $trainer2, 19, 30, 60, 'Средний',   15],
            ],
            6 => [ // Суббота
                ['Йога',              $hallGroup2,     $trainer2, 11, 0,  90, 'Начальный', 15],
                ['Зумба',             $hallGroup1,     $trainer4, 13, 0,  60, 'Начальный', 25],
                ['Силовые тренировки',$hallGym,        $trainer3, 15, 0,  60, 'Высокий',   20],
                ['Функциональный',    $hallFunctional, $trainer1, 17, 0,  60, 'Средний',   12],
            ],
        ];

        $sessionPeriodStart = Carbon::create(2026, 3, 1);
        $sessionPeriodEnd   = Carbon::create(2026, 4, 21);

        $allSessions = []; // ['session' => Session, 'status' => string, 'max' => int]

        $cursor = $sessionPeriodStart->copy();
        while ($cursor->lte($sessionPeriodEnd)) {
            $dow = $cursor->dayOfWeekIso; // 1=Mon … 7=Sun
            if (isset($schedule[$dow])) {
                foreach ($schedule[$dow] as [$name, $hall, $trainer, $h, $m, $dur, $diff, $maxP]) {
                    $startsAt = $cursor->copy()->setTime($h, $m, 0);
                    $endsAt   = $startsAt->copy()->addMinutes($dur);
                    $status   = $startsAt->lt($today) ? 'completed' : 'scheduled';

                    $session = Session::create([
                        'hall_id'    => $hall->id,
                        'trainer_id' => $trainer->person_id,
                        'starts_at'  => $startsAt,
                        'ends_at'    => $endsAt,
                        'status'     => $status,
                        'type'       => 'group',
                    ]);

                    GroupSession::create([
                        'session_id'       => $session->id,
                        'name'             => $name,
                        'difficulty_level' => $diff,
                        'max_participants' => $maxP,
                    ]);

                    $allSessions[] = ['session' => $session, 'status' => $status, 'max' => $maxP];
                }
            }
            $cursor->addDay();
        }

        // ════════════════════════════════════════════════════════════════════
        // 5. Записи и посещения для групповых занятий
        //    Прошедшие: 80% visited, 12% late, 8% no_show
        //    Будущие:   booking confirmed
        // ════════════════════════════════════════════════════════════════════
        $clientIds = array_map(fn($c) => $c->person_id, $clients);
        $totalC    = count($clientIds);

        // Детерминированное распределение статусов на основе индекса участника:
        // первые 80% → visited, следующие 12% → late, оставшиеся 8% → no_show
        $visitStatusFn = function (int $participantIdx, int $total): string {
            $ratio = $participantIdx / max($total - 1, 1);
            if ($ratio < 0.80) return 'visited';
            if ($ratio < 0.92) return 'late';
            return 'no_show';
        };

        foreach ($allSessions as $sIdx => $sd) {
            /** @var Session $session */
            $session = $sd['session'];
            $isPast  = $sd['status'] === 'completed';
            $maxP    = $sd['max'];

            // Заполняемость: 40%–70% от вместимости
            $fillPct      = 0.40 + ($sIdx % 4) * 0.075;
            $bookingCount = max(1, (int) round($maxP * $fillPct));
            $bookingCount = min($bookingCount, $maxP);

            // Рассредоточиваем клиентов по занятиям через простое число 17
            $offset   = ($sIdx * 17) % $totalC;
            $assigned = [];
            for ($k = 0; $k < $bookingCount; $k++) {
                $assigned[] = $clientIds[($offset + $k) % $totalC];
            }
            $assigned = array_unique(array_values($assigned));
            $assignedCount = count($assigned);

            foreach ($assigned as $pIdx => $clientId) {
                Booking::create([
                    'client_id'        => $clientId,
                    'session_id'       => $session->id,
                    'administrator_id' => $adminPerson->id,
                    'status'           => 'confirmed',
                ]);

                if ($isPast) {
                    $membership = $clientMemberships[$clientId] ?? null;
                    if ($membership) {
                        $visitStatus = $visitStatusFn($pIdx, $assignedCount);
                        Visit::create([
                            'client_id'        => $clientId,
                            'session_id'       => $session->id,
                            'administrator_id' => $adminPerson->id,
                            'membership_id'    => $membership->id,
                            'visited_at'       => $session->starts_at,
                            'status'           => $visitStatus,
                            'is_manual_entry'  => false,
                        ]);
                    }
                }
            }
        }

        // ════════════════════════════════════════════════════════════════════
        // 6. Персональные тренировки (01.03.2026 – 21.04.2026)
        // ════════════════════════════════════════════════════════════════════
        // Шаблон: [trainer, hall, hour, min, dur_min]
        $personalTemplates = [
            [$trainer1, $hallGym,        8,  0, 60],
            [$trainer1, $hallGym,        11, 0, 60],
            [$trainer2, $hallFunctional, 9,  0, 60],
            [$trainer2, $hallFunctional, 16, 0, 60],
            [$trainer3, $hallGym,        8,  0, 60],
            [$trainer3, $hallGym,        14, 0, 60],
            [$trainer4, $hallGroup2,     10, 0, 60],
        ];

        // Дни недели для персоналок: Пн(1), Ср(3), Пт(5)
        $personalDays = [1, 3, 5];

        $personalPeriodStart = Carbon::create(2026, 3, 1);
        $personalPeriodEnd   = Carbon::create(2026, 4, 21);
        $tmplCount           = count($personalTemplates);
        $tmplIdx             = 0; // cycle through templates

        // Клиенты для персоналок: берём каждого 5-го (20 клиентов из 100)
        $personalClients = array_values(
            array_filter($clients, fn($c, $i) => $i % 5 === 0, ARRAY_FILTER_USE_BOTH)
        );
        $pcCount = count($personalClients);
        $pcIdx   = 0;

        $personalCursor = $personalPeriodStart->copy();
        $personalSessionCount = 0;
        $personalVisitCount   = 0;

        while ($personalCursor->lte($personalPeriodEnd)) {
            $dow = $personalCursor->dayOfWeekIso;
            if (in_array($dow, $personalDays, true)) {
                // 2 персональных занятия в день
                for ($slot = 0; $slot < 2; $slot++) {
                    [$trn, $hall, $h, $m, $dur] = $personalTemplates[$tmplIdx % $tmplCount];
                    $tmplIdx++;

                    $startsAt = $personalCursor->copy()->setTime($h + $slot * 2, $m, 0);
                    $endsAt   = $startsAt->copy()->addMinutes($dur);
                    $isPast   = $startsAt->lt($today);
                    $status   = $isPast ? 'completed' : 'scheduled';

                    $clientForSession = $personalClients[$pcIdx % $pcCount];
                    $pcIdx++;

                    $session = Session::create([
                        'hall_id'    => $hall->id,
                        'trainer_id' => $trn->person_id,
                        'starts_at'  => $startsAt,
                        'ends_at'    => $endsAt,
                        'status'     => $status,
                        'type'       => 'personal',
                    ]);

                    PersonalSession::create([
                        'session_id' => $session->id,
                        'client_id'  => $clientForSession->person_id,
                    ]);

                    // Booking для клиента персоналки
                    Booking::create([
                        'client_id'        => $clientForSession->person_id,
                        'session_id'       => $session->id,
                        'administrator_id' => $adminPerson->id,
                        'status'           => 'confirmed',
                    ]);

                    // Visit для прошедших
                    if ($isPast) {
                        $membership = $clientMemberships[$clientForSession->person_id] ?? null;
                        if ($membership) {
                            Visit::create([
                                'client_id'        => $clientForSession->person_id,
                                'session_id'       => $session->id,
                                'administrator_id' => $adminPerson->id,
                                'membership_id'    => $membership->id,
                                'visited_at'       => $startsAt,
                                'status'           => 'visited',
                                'is_manual_entry'  => false,
                            ]);
                            $personalVisitCount++;
                        }
                    }

                    $personalSessionCount++;
                }
            }
            $personalCursor->addDay();
        }

        $sessionCount = count($allSessions);
        $pastSessions = count(array_filter($allSessions, fn($s) => $s['status'] === 'completed'));

        $this->command->info('');
        $this->command->info('✔ Тестовые данные успешно загружены!');
        $this->command->info("  Клиентов: 100 (90 с паспортами, все г. Омск)");
        $this->command->info("  Абонементов: 100");
        $this->command->info("  Групповых занятий: {$sessionCount} (прошедших: {$pastSessions})");
        $this->command->info("  Персональных занятий: {$personalSessionCount} (посещений: {$personalVisitCount})");
        $this->command->info('');
        $this->command->info('  Новые тренеры:');
        $this->command->info('    trainer3@fitclub.ru — Степанов Иван Андреевич');
        $this->command->info('    trainer4@fitclub.ru — Захарова Анастасия Петровна');
        $this->command->info('  Новый администратор:');
        $this->command->info('    admin2@fitclub.ru  — Воронова Ольга Сергеевна');
        $this->command->info('  Пароль для всех: password');
    }

    // ─────────────────────────────────────────────────────────────────────
    /**
     * Создаёт User + присваивает роль + создаёт Person.
     */
    private function makeUser(
        string  $email,
        string  $fullName,
        string  $roleName,
        ?string $phone     = null,
        ?string $birthDate = null
    ): Person {
        $loginBase = Str::before($email, '@');
        $login     = $loginBase;
        $suffix    = 1;
        while (User::where('login', $login)->exists()) {
            $login = $loginBase . $suffix++;
        }

        $user = User::create([
            'email'    => $email,
            'login'    => $login,
            'password' => Hash::make('password'),
        ]);

        $role = Role::where('name', $roleName)->firstOrFail();
        $user->roles()->attach($role);

        return Person::create([
            'user_id'        => $user->id,
            'full_name'      => $fullName,
            'phone'          => $phone,
            'birth_date'     => $birthDate,
            'plain_password' => 'password',
        ]);
    }
}
