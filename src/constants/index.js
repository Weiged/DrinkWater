export const COLORS = {
  primary: '#4FC3F7',
  secondary: '#29B6F6',
  accent: '#81C784',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  water: '#2196F3',
  gradient: ['#4FC3F7', '#29B6F6']
};

export const SIZES = {
  padding: 16,
  margin: 16,
  borderRadius: 12,
  iconSize: 24,
  headerHeight: 60
};

export const QUICK_ADD_OPTIONS = [
  { id: 1, amount: 100, label: '100ml' },
  { id: 2, amount: 200, label: '200ml' },
  { id: 3, amount: 250, label: '250ml' },
  { id: 4, amount: 300, label: '300ml' },
  { id: 5, amount: 500, label: '500ml' },
  { id: 6, amount: 750, label: '750ml' }
];

export const DEFAULT_DAILY_GOAL = 2000; // 毫升

export const NOTIFICATION_INTERVALS = [
  { id: 1, minutes: 30, label: '30 分钟' },
  { id: 2, minutes: 60, label: '1 小时' },
  { id: 3, minutes: 90, label: '1.5 小时' },
  { id: 4, minutes: 120, label: '2 小时' }
];

export const STORAGE_KEYS = {
  DAILY_GOAL: 'daily_goal',
  WATER_RECORDS: 'water_records',
  QUICK_ADD_OPTIONS: 'quick_add_options',
  NOTIFICATION_SETTINGS: 'notification_settings',
  USER_PROFILE: 'user_profile'
}; 