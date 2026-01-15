import { RecurringTask, Verksamhetsomrade, Station, Profile, UserStation } from './types';

const currentYear = new Date().getFullYear();

// =============================================
// VERKSAMHETSOMRÅDEN (Operational Areas)
// =============================================
export const mockVerksamhetsomraden: Verksamhetsomrade[] = [
    {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'VO Nord',
        description: 'Verksamhetsområde Nord',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'VO Mitt',
        description: 'Verksamhetsområde Mitt',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'VO Syd',
        description: 'Verksamhetsområde Syd',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

// =============================================
// STATIONS
// =============================================
export const mockStations: Station[] = [
    {
        id: 'aaaa1111-1111-1111-1111-111111111111',
        name: 'Norrtälje',
        vo_id: '11111111-1111-1111-1111-111111111111',
        address: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'aaaa2222-2222-2222-2222-222222222222',
        name: 'Rimbo',
        vo_id: '11111111-1111-1111-1111-111111111111',
        address: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'aaaa3333-3333-3333-3333-333333333333',
        name: 'Hallstavik',
        vo_id: '11111111-1111-1111-1111-111111111111',
        address: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

// =============================================
// USERS
// =============================================
export const mockUsers: Profile[] = [
    {
        id: 'user-1',
        email: 'stationschef@ambulans.se',
        full_name: 'Anders Stationschef',
        role: 'station_manager',
        vo_id: '11111111-1111-1111-1111-111111111111',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'user-2',
        email: 'bitrchef@ambulans.se',
        full_name: 'Bitr. Chef',
        role: 'assistant_manager',
        vo_id: '11111111-1111-1111-1111-111111111111',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'admin-1',
        email: 'admin@ambulans.se',
        full_name: 'System Admin',
        role: 'admin',
        vo_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

// =============================================
// USER-STATION ASSIGNMENTS
// =============================================
export const mockUserStations: UserStation[] = [
    // Station manager assigned to all 3 stations
    { id: 'us-1', user_id: 'user-1', station_id: 'aaaa1111-1111-1111-1111-111111111111', created_at: new Date().toISOString() },
    { id: 'us-2', user_id: 'user-1', station_id: 'aaaa2222-2222-2222-2222-222222222222', created_at: new Date().toISOString() },
    { id: 'us-3', user_id: 'user-1', station_id: 'aaaa3333-3333-3333-3333-333333333333', created_at: new Date().toISOString() },
    // Assistant manager assigned to all 3 stations
    { id: 'us-4', user_id: 'user-2', station_id: 'aaaa1111-1111-1111-1111-111111111111', created_at: new Date().toISOString() },
    { id: 'us-5', user_id: 'user-2', station_id: 'aaaa2222-2222-2222-2222-222222222222', created_at: new Date().toISOString() },
    { id: 'us-6', user_id: 'user-2', station_id: 'aaaa3333-3333-3333-3333-333333333333', created_at: new Date().toISOString() },
];

// =============================================
// TASKS (Year Wheel)
// =============================================
export const mockTasks: RecurringTask[] = [
    // January Tasks (General - no station)
    {
        id: '1',
        title: 'Lansering kompetenstorget',
        description: null,
        month: 1,
        tertial: 1,
        category: 'HR',
        status: 'not_started',
        assigned_to: null,
        station_id: null,
        notes: null,
        is_recurring_monthly: false,
        year: currentYear,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '2',
        title: 'Helårsuppföljning kort/långtidsfrånvaro',
        description: null,
        month: 1,
        tertial: 1,
        category: 'HR',
        status: 'in_progress',
        assigned_to: 'user-1',
        station_id: null,
        notes: 'Väntar på svar från HR-avdelningen',
        is_recurring_monthly: false,
        year: currentYear,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '3',
        title: 'Löneöversyn',
        description: null,
        month: 1,
        tertial: 1,
        category: 'Finance',
        status: 'done',
        assigned_to: 'user-2',
        station_id: null,
        notes: 'Slutfört 2026-01-10',
        is_recurring_monthly: false,
        year: currentYear,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '4',
        title: 'Handlingsplan OSA',
        description: null,
        month: 1,
        tertial: 1,
        category: 'Safety',
        status: 'not_started',
        assigned_to: null,
        station_id: null,
        notes: null,
        is_recurring_monthly: false,
        year: currentYear,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    // February Tasks
    {
        id: '5',
        title: 'Lönesamtal',
        description: null,
        month: 2,
        tertial: 1,
        category: 'Finance',
        status: 'not_started',
        assigned_to: null,
        station_id: null,
        notes: null,
        is_recurring_monthly: false,
        year: currentYear,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '6',
        title: 'Uppföljning sjukfrånvaro',
        description: null,
        month: 2,
        tertial: 1,
        category: 'HR',
        status: 'not_started',
        assigned_to: null,
        station_id: null,
        notes: null,
        is_recurring_monthly: false,
        year: currentYear,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    // Station-specific task example
    {
        id: '7',
        title: 'Inventering brandskyddsutrustning',
        description: 'Kontrollera brandskyddsutrustning på stationen',
        month: 1,
        tertial: 1,
        category: 'Safety',
        status: 'not_started',
        assigned_to: 'user-1',
        station_id: 'aaaa1111-1111-1111-1111-111111111111', // Norrtälje specific
        notes: null,
        is_recurring_monthly: false,
        year: currentYear,
        created_by: 'user-2',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    // Recurring Monthly
    {
        id: '8',
        title: 'Kontroll av övertid',
        description: null,
        month: null,
        tertial: 1,
        category: 'Finance',
        status: 'not_started',
        assigned_to: null,
        station_id: null,
        notes: null,
        is_recurring_monthly: true,
        year: currentYear,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '9',
        title: 'Uppföljning sjukfrånvaro',
        description: null,
        month: null,
        tertial: 1,
        category: 'HR',
        status: 'not_started',
        assigned_to: null,
        station_id: null,
        notes: null,
        is_recurring_monthly: true,
        year: currentYear,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    // November Tasks
    {
        id: '10',
        title: 'Utvecklingssamtal',
        description: null,
        month: 11,
        tertial: 3,
        category: 'HR',
        status: 'not_started',
        assigned_to: null,
        station_id: null,
        notes: null,
        is_recurring_monthly: false,
        year: currentYear,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '11',
        title: 'Uppföljning LAS-tid',
        description: null,
        month: 11,
        tertial: 3,
        category: 'HR',
        status: 'not_started',
        assigned_to: null,
        station_id: null,
        notes: null,
        is_recurring_monthly: false,
        year: currentYear,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

// =============================================
// HELPER FUNCTIONS
// =============================================

export function getTasksForMonth(month: number): RecurringTask[] {
    return mockTasks.filter(
        task => task.month === month || task.is_recurring_monthly
    );
}

export function getStationsForVO(voId: string): Station[] {
    return mockStations.filter(s => s.vo_id === voId);
}

export function getUserStations(userId: string): Station[] {
    const stationIds = mockUserStations
        .filter(us => us.user_id === userId)
        .map(us => us.station_id);
    return mockStations.filter(s => stationIds.includes(s.id));
}

export function getStationName(stationId: string | null): string {
    if (!stationId) return 'Generell';
    const station = mockStations.find(s => s.id === stationId);
    return station?.name || 'Okänd';
}

export function getUserName(userId: string | null): string {
    if (!userId) return 'Ej tilldelad';
    const user = mockUsers.find(u => u.id === userId);
    return user?.full_name || 'Okänd';
}

export function getColleaguesForUser(userId: string): Profile[] {
    const userStationIds = mockUserStations
        .filter(us => us.user_id === userId)
        .map(us => us.station_id);

    const colleagueIds = mockUserStations
        .filter(us => userStationIds.includes(us.station_id))
        .map(us => us.user_id);

    return mockUsers.filter(u => colleagueIds.includes(u.id));
}
