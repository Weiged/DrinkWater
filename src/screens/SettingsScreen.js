import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, DEFAULT_DAILY_GOAL, NOTIFICATION_INTERVALS } from '../constants';
import { StorageUtils } from '../utils/storage';
import { NotificationUtils } from '../utils/notifications';

export default function SettingsScreen() {
  const [dailyGoal, setDailyGoal] = useState(DEFAULT_DAILY_GOAL.toString());
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationInterval, setNotificationInterval] = useState(60);
  const [smartReminder, setSmartReminder] = useState(true);
  const [reminderStartHour, setReminderStartHour] = useState(7);
  const [reminderEndHour, setReminderEndHour] = useState(22);

  useEffect(() => {
    loadSettings();
  }, []);

  // 加载设置
  const loadSettings = async () => {
    try {
      const goal = await StorageUtils.getDailyGoal();
      if (goal) setDailyGoal(goal.toString());

      const notificationSettings = await StorageUtils.getNotificationSettings();
      if (notificationSettings) {
        setNotificationEnabled(notificationSettings.enabled || false);
        setNotificationInterval(notificationSettings.interval || 60);
        setSmartReminder(notificationSettings.smart || true);
        setReminderStartHour(notificationSettings.startHour || 7);
        setReminderEndHour(notificationSettings.endHour || 22);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };

  // 保存每日目标
  const saveDailyGoal = async () => {
    try {
      const goal = parseInt(dailyGoal);
      if (isNaN(goal) || goal <= 0) {
        Alert.alert('错误', '请输入有效的目标值');
        return;
      }
      
      await StorageUtils.saveDailyGoal(goal);
      Alert.alert('成功', '每日目标已保存');
    } catch (error) {
      console.error('保存目标失败:', error);
      Alert.alert('错误', '保存失败，请重试');
    }
  };

  // 切换通知开关
  const toggleNotification = async (enabled) => {
    try {
      setNotificationEnabled(enabled);
      
      if (enabled) {
        const hasPermission = await NotificationUtils.requestPermissions();
        if (!hasPermission) {
          setNotificationEnabled(false);
          Alert.alert('权限被拒绝', '请在设置中开启通知权限');
          return;
        }
        
        // 设置提醒
        if (smartReminder) {
          await NotificationUtils.scheduleSmartReminder(
            notificationInterval,
            reminderStartHour,
            reminderEndHour
          );
        } else {
          await NotificationUtils.scheduleWaterReminder(notificationInterval);
        }
      } else {
        await NotificationUtils.cancelAllReminders();
      }
      
      // 保存设置
      await saveNotificationSettings();
    } catch (error) {
      console.error('设置通知失败:', error);
      Alert.alert('错误', '设置失败，请重试');
    }
  };

  // 更新通知间隔
  const updateNotificationInterval = async (interval) => {
    try {
      setNotificationInterval(interval);
      
      if (notificationEnabled) {
        if (smartReminder) {
          await NotificationUtils.scheduleSmartReminder(
            interval,
            reminderStartHour,
            reminderEndHour
          );
        } else {
          await NotificationUtils.scheduleWaterReminder(interval);
        }
      }
      
      await saveNotificationSettings();
    } catch (error) {
      console.error('更新通知间隔失败:', error);
    }
  };

  // 切换智能提醒
  const toggleSmartReminder = async (enabled) => {
    try {
      setSmartReminder(enabled);
      
      if (notificationEnabled) {
        if (enabled) {
          await NotificationUtils.scheduleSmartReminder(
            notificationInterval,
            reminderStartHour,
            reminderEndHour
          );
        } else {
          await NotificationUtils.scheduleWaterReminder(notificationInterval);
        }
      }
      
      await saveNotificationSettings();
    } catch (error) {
      console.error('切换智能提醒失败:', error);
    }
  };

  // 保存通知设置
  const saveNotificationSettings = async () => {
    const settings = {
      enabled: notificationEnabled,
      interval: notificationInterval,
      smart: smartReminder,
      startHour: reminderStartHour,
      endHour: reminderEndHour
    };
    await StorageUtils.saveNotificationSettings(settings);
  };

  // 清除所有数据
  const clearAllData = () => {
    Alert.alert(
      '确认清除',
      '这将删除所有饮水记录和设置，此操作不可恢复。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageUtils.removeItem('water_records');
              await StorageUtils.removeItem('daily_goal');
              await StorageUtils.removeItem('notification_settings');
              Alert.alert('成功', '所有数据已清除');
              loadSettings();
            } catch (error) {
              Alert.alert('错误', '清除数据失败');
            }
          }
        }
      ]
    );
  };

  // 渲染设置项
  const renderSettingItem = (title, subtitle, children) => (
    <View style={styles.settingItem}>
      <View style={styles.settingHeader}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {children}
    </View>
  );

  // 渲染开关设置
  const renderSwitchSetting = (title, subtitle, value, onValueChange) => (
    <View style={styles.settingItem}>
      <View style={styles.settingContent}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: COLORS.background, true: COLORS.primary }}
          thumbColor={value ? COLORS.surface : COLORS.textSecondary}
        />
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 头部 */}
      <LinearGradient
        colors={COLORS.gradient}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>设置</Text>
        <Text style={styles.headerSubtitle}>个性化你的喝水体验</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* 每日目标设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>每日目标</Text>
          {renderSettingItem(
            '饮水目标',
            '设置你的每日饮水量目标',
            <View style={styles.goalInputContainer}>
              <TextInput
                style={styles.goalInput}
                value={dailyGoal}
                onChangeText={setDailyGoal}
                keyboardType="numeric"
                placeholder="2000"
              />
              <Text style={styles.goalUnit}>ml</Text>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveDailyGoal}
              >
                <Text style={styles.saveButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 通知设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>通知提醒</Text>
          
          {renderSwitchSetting(
            '开启提醒',
            '定时提醒你喝水',
            notificationEnabled,
            toggleNotification
          )}

          {notificationEnabled && (
            <>
              {renderSwitchSetting(
                '智能提醒',
                '避开睡眠时间，只在活跃时段提醒',
                smartReminder,
                toggleSmartReminder
              )}

              {renderSettingItem(
                '提醒间隔',
                '选择提醒频率',
                <View style={styles.intervalContainer}>
                  {NOTIFICATION_INTERVALS.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.intervalButton,
                        notificationInterval === item.minutes && styles.activeInterval
                      ]}
                      onPress={() => updateNotificationInterval(item.minutes)}
                    >
                      <Text style={[
                        styles.intervalText,
                        notificationInterval === item.minutes && styles.activeIntervalText
                      ]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {smartReminder && renderSettingItem(
                '活跃时段',
                '设置接收提醒的时间范围',
                <View style={styles.timeRangeContainer}>
                  <View style={styles.timeInputContainer}>
                    <Text style={styles.timeLabel}>开始时间</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={reminderStartHour.toString()}
                      onChangeText={(text) => {
                        const hour = parseInt(text) || 0;
                        if (hour >= 0 && hour <= 23) {
                          setReminderStartHour(hour);
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text style={styles.timeUnit}>:00</Text>
                  </View>
                  <Text style={styles.timeSeparator}>-</Text>
                  <View style={styles.timeInputContainer}>
                    <Text style={styles.timeLabel}>结束时间</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={reminderEndHour.toString()}
                      onChangeText={(text) => {
                        const hour = parseInt(text) || 0;
                        if (hour >= 0 && hour <= 23) {
                          setReminderEndHour(hour);
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text style={styles.timeUnit}>:00</Text>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* 数据管理 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>数据管理</Text>
          
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={clearAllData}
          >
            <Text style={styles.dangerButtonText}>清除所有数据</Text>
          </TouchableOpacity>
        </View>

        {/* 应用信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>关于</Text>
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>喝水提醒 v1.0.0</Text>
            <Text style={styles.infoSubtext}>帮助你养成健康的饮水习惯</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: SIZES.padding,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.surface,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.surface,
    opacity: 0.9,
  },
  content: {
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: COLORS.surface,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
    paddingHorizontal: SIZES.padding,
    paddingTop: 20,
  },
  settingItem: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SIZES.padding,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  settingHeader: {
    marginBottom: 10,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  goalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: COLORS.background,
  },
  goalUnit: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginLeft: 10,
    marginRight: 15,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: SIZES.borderRadius,
  },
  saveButtonText: {
    color: COLORS.surface,
    fontWeight: '600',
  },
  intervalContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  intervalButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: SIZES.borderRadius,
    backgroundColor: COLORS.background,
    marginRight: 10,
    marginBottom: 10,
  },
  activeInterval: {
    backgroundColor: COLORS.primary,
  },
  intervalText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  activeIntervalText: {
    color: COLORS.surface,
    fontWeight: '600',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  timeInputContainer: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: COLORS.background,
    textAlign: 'center',
    width: 50,
  },
  timeUnit: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  timeSeparator: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginHorizontal: 20,
  },
  dangerButton: {
    backgroundColor: COLORS.error,
    paddingVertical: 15,
    paddingHorizontal: SIZES.padding,
    borderRadius: SIZES.borderRadius,
    marginHorizontal: SIZES.padding,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    paddingHorizontal: SIZES.padding,
    alignItems: 'center',
    paddingVertical: 20,
  },
  infoText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 5,
  },
  infoSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
}); 