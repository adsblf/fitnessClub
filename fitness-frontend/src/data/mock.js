// ============================================================
// МОКОВАННЫЕ ДАННЫЕ — заменить на реальные API-запросы позже
// ============================================================

export const adminStats = {
  revenueToday: 18400,
  revenueMonth: 312500,
  visitsToday: 47,
  activeMemberships: 214,
  upcomingClasses: 8,
  newClientsMonth: 23,
};

export const revenueChart = [
  { day: "Пн", amount: 14200 },
  { day: "Вт", amount: 18900 },
  { day: "Ср", amount: 12400 },
  { day: "Чт", amount: 21000 },
  { day: "Пт", amount: 26300 },
  { day: "Сб", amount: 31200 },
  { day: "Вс", amount: 18400 },
];

export const trainerStats = [
  { id: 1, name: "Анна Соколова", classes: 24, clients: 38, fillRate: 87, revenue: 74200 },
  { id: 2, name: "Игорь Петров",  classes: 18, clients: 29, fillRate: 72, revenue: 53100 },
  { id: 3, name: "Мария Блинова", classes: 21, clients: 34, fillRate: 91, revenue: 68900 },
  { id: 4, name: "Дмитрий Козлов",classes: 15, clients: 22, fillRate: 65, revenue: 41300 },
];

export const recentVisits = [
  { id: 1, client: "Елена Мишина",   time: "09:15", class: "Йога",        trainer: "Анна Соколова",  status: "ПОСЕЩЕНО" },
  { id: 2, client: "Павел Рогов",    time: "10:00", class: "Силовая",     trainer: "Игорь Петров",   status: "ПОСЕЩЕНО" },
  { id: 3, client: "Ирина Фёдорова", time: "10:00", class: "Силовая",     trainer: "Игорь Петров",   status: "НЕЯВКА" },
  { id: 4, client: "Сергей Ларин",   time: "11:30", class: "Кроссфит",    trainer: "Дмитрий Козлов", status: "ПОСЕЩЕНО" },
  { id: 5, client: "Наталья Сова",   time: "12:00", class: "Пилатес",     trainer: "Мария Блинова",  status: "ПОСЕЩЕНО" },
];

// ---- КЛИЕНТ ----

export const currentClient = {
  name: "Елена Мишина",
  email: "elena@example.com",
  membershipType: "Безлимитный",
  membershipStatus: "АКТИВНЫЙ",
  membershipExpiry: "2025-08-15",
  visitsLeft: null, // null = безлимит
  visitsTotal: 87,
  memberSince: "2024-01-10",
};

export const clientUpcomingBookings = [
  { id: 1, class: "Йога (утро)",   date: "2025-04-02", time: "09:00", trainer: "Анна Соколова",  hall: "Зал №2", status: "ПОДТВЕРЖДЕНО" },
  { id: 2, class: "Пилатес",       date: "2025-04-04", time: "11:00", trainer: "Мария Блинова",  hall: "Зал №2", status: "ЗАБРОНИРОВАНО" },
  { id: 3, class: "Растяжка",      date: "2025-04-07", time: "19:30", trainer: "Анна Соколова",  hall: "Зал №3", status: "ЗАБРОНИРОВАНО" },
];

export const clientVisitHistory = [
  { id: 1, class: "Йога",       date: "2025-03-28", time: "09:00", trainer: "Анна Соколова",  status: "ПОСЕЩЕНО" },
  { id: 2, class: "Пилатес",    date: "2025-03-25", time: "11:00", trainer: "Мария Блинова",  status: "ПОСЕЩЕНО" },
  { id: 3, class: "Кроссфит",   date: "2025-03-21", time: "10:00", trainer: "Дмитрий Козлов", status: "НЕЯВКА" },
  { id: 4, class: "Силовая",    date: "2025-03-18", time: "18:00", trainer: "Игорь Петров",   status: "ПОСЕЩЕНО" },
  { id: 5, class: "Йога",       date: "2025-03-14", time: "09:00", trainer: "Анна Соколова",  status: "ПОСЕЩЕНО" },
];

// ---- РАСПИСАНИЕ ----

export const scheduleClasses = [
  {
    id: 1,
    name: "Йога (утро)",
    type: "group",
    date: "2025-04-02",
    time: "09:00",
    duration: 60,
    trainer: "Анна Соколова",
    hall: "Зал №2",
    capacity: 15,
    booked: 11,
    level: "Начинающий",
    description: "Мягкая утренняя практика для всех уровней подготовки. Работа с дыханием и растяжкой.",
  },
  {
    id: 2,
    name: "Силовая",
    type: "group",
    date: "2025-04-02",
    time: "10:00",
    duration: 60,
    trainer: "Игорь Петров",
    hall: "Зал №1",
    capacity: 20,
    booked: 20,
    level: "Средний",
    description: "Тренировка с отягощениями. Упор на базовые упражнения.",
  },
  {
    id: 3,
    name: "Пилатес",
    type: "group",
    date: "2025-04-02",
    time: "11:00",
    duration: 55,
    trainer: "Мария Блинова",
    hall: "Зал №2",
    capacity: 12,
    booked: 7,
    level: "Начинающий",
    description: "Укрепление мышц кора, работа над осанкой и балансом.",
  },
  {
    id: 4,
    name: "Кроссфит",
    type: "group",
    date: "2025-04-02",
    time: "12:00",
    duration: 60,
    trainer: "Дмитрий Козлов",
    hall: "Функциональный зал",
    capacity: 16,
    booked: 9,
    level: "Продвинутый",
    description: "Высокоинтенсивная функциональная тренировка. Требует базовой физподготовки.",
  },
  {
    id: 5,
    name: "Растяжка",
    type: "group",
    date: "2025-04-03",
    time: "19:30",
    duration: 45,
    trainer: "Анна Соколова",
    hall: "Зал №3",
    capacity: 20,
    booked: 5,
    level: "Начинающий",
    description: "Восстановительная тренировка. Подходит после силовых нагрузок.",
  },
  {
    id: 6,
    name: "Йога (вечер)",
    type: "group",
    date: "2025-04-03",
    time: "20:00",
    duration: 60,
    trainer: "Анна Соколова",
    hall: "Зал №2",
    capacity: 15,
    booked: 13,
    level: "Средний",
    description: "Вечерняя практика для снятия напряжения после рабочего дня.",
  },
  {
    id: 7,
    name: "Функциональный тренинг",
    type: "group",
    date: "2025-04-04",
    time: "10:00",
    duration: 60,
    trainer: "Игорь Петров",
    hall: "Функциональный зал",
    capacity: 16,
    booked: 8,
    level: "Средний",
    description: "Тренировка с использованием собственного веса и TRX.",
  },
  {
    id: 8,
    name: "Пилатес",
    type: "group",
    date: "2025-04-04",
    time: "11:00",
    duration: 55,
    trainer: "Мария Блинова",
    hall: "Зал №2",
    capacity: 12,
    booked: 4,
    level: "Начинающий",
    description: "Укрепление мышц кора, работа над осанкой и балансом.",
  },
];

// id занятий, на которые клиент уже записан
export const clientBookedClassIds = [1, 3];
