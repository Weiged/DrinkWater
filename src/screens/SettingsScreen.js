import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, DEFAULT_DAILY_GOAL, NOTIFICATION_INTERVALS, QUICK_ADD_OPTIONS } from '../constants';
import { StorageUtils } from '../utils/storage';
import { NotificationUtils } from '../utils/notifications';
import { BackgroundTaskUtils } from '../utils/backgroundTasks';
import CustomAlert from '../utils/CustomAlert';
import { useCustomAlert } from '../utils/useCustomAlert';
import { STORAGE_KEYS } from '../constants';

export default function SettingsScreen() {
  const [dailyGoal, setDailyGoal] = useState(DEFAULT_DAILY_GOAL.toString());
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationInterval, setNotificationInterval] = useState(60);
  const [smartReminder, setSmartReminder] = useState(true);
  const [reminderStartHour, setReminderStartHour] = useState(7);
  const [reminderEndHour, setReminderEndHour] = useState(22);
  const [quickAddOptions, setQuickAddOptions] = useState(QUICK_ADD_OPTIONS);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [editingOption, setEditingOption] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [showAddOptionModal, setShowAddOptionModal] = useState(false);
  const [newOptionAmount, setNewOptionAmount] = useState('');
  
  // 使用自定义Alert hook
  const { alertVisible, alertConfig, showAlert, showConfirm } = useCustomAlert();

  useEffect(() => {
    loadSettings();
  }, []);

  // 加载设置
  const loadSettings = async () => {
    try {
      const goal = await StorageUtils.getDailyGoal();
      if (goal) setDailyGoal(goal.toString());

      const notificationSettings = await StorageUtils.getNotificationSettings();
      console.log('🔧 [SettingsScreen] 加载通知设置:', notificationSettings);
      
      if (notificationSettings) {
        console.log('🔧 [SettingsScreen] 设置通知状态为:', notificationSettings.enabled || false);
        setNotificationEnabled(notificationSettings.enabled || false);
        setNotificationInterval(notificationSettings.interval || 60);
        setSmartReminder(notificationSettings.smart !== undefined ? notificationSettings.smart : true);
        setReminderStartHour(notificationSettings.startHour || 7);
        setReminderEndHour(notificationSettings.endHour || 22);
        
        // 如果通知已启用，检查今日目标状态
        if (notificationSettings.enabled) {
          console.log('🔧 [SettingsScreen] 通知已启用，检查今日目标状态');
          await checkGoalStatusAndSetReminder('load_settings', { showAlert: false });
        }
      } else {
        console.log('🔧 [SettingsScreen] 未找到通知设置，使用默认值');
        setNotificationEnabled(false);
        setNotificationInterval(60);
        setSmartReminder(true);
        setReminderStartHour(7);
        setReminderEndHour(22);
      }

      // 加载快捷添加选项
      const customOptions = await StorageUtils.getQuickAddOptions();
      if (customOptions && customOptions.length > 0) {
        setQuickAddOptions(customOptions);
      } else {
        setQuickAddOptions(QUICK_ADD_OPTIONS);
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
        showAlert('错误', '请输入有效的目标值', 'error');
        return;
      }
      
      await StorageUtils.saveDailyGoal(goal);
      
      // 如果通知已开启，检查新目标下的通知状态
      if (notificationEnabled) {
        console.log('🔧 [SettingsScreen] 目标已更新，重新检查通知状态');
        await checkGoalStatusAndSetReminder('update_goal', { showAlert: false });
      }
      
      showAlert('成功', '每日目标已保存', 'success');
    } catch (error) {
      console.error('保存目标失败:', error);
      showAlert('错误', '保存失败，请重试', 'error');
    }
  };

  // 切换通知开关
  const toggleNotification = async (enabled) => {
    try {
      console.log('🔧 [SettingsScreen] 切换通知开关:', enabled);
      
      if (enabled) {
        const hasPermission = await NotificationUtils.requestPermissions();
        if (!hasPermission) {
          console.log('🔧 [SettingsScreen] 权限被拒绝，保存禁用状态');
          setNotificationEnabled(false);
          // 直接保存禁用状态，不依赖state
          const settings = {
            enabled: false,
            interval: notificationInterval,
            smart: smartReminder,
            startHour: reminderStartHour,
            endHour: reminderEndHour
          };
          console.log('🔧 [SettingsScreen] 保存设置:', settings);
          await StorageUtils.saveNotificationSettings(settings);
          showAlert('权限被拒绝', '请在设置中开启通知权限', 'warning');
          return;
        }
        
        console.log('🔧 [SettingsScreen] 权限获取成功，检查今日目标状态');
        setNotificationEnabled(true);
        
        // 使用通用方法检查目标状态并设置提醒
        await checkGoalStatusAndSetReminder('enable_notification');
        
        // 保存启用状态
        const settings = {
          enabled: true,
          interval: notificationInterval,
          smart: smartReminder,
          startHour: reminderStartHour,
          endHour: reminderEndHour
        };
        console.log('🔧 [SettingsScreen] 保存启用设置:', settings);
        await StorageUtils.saveNotificationSettings(settings);
      } else {
        console.log('🔧 [SettingsScreen] 禁用通知');
        setNotificationEnabled(false);
        await NotificationUtils.cancelAllReminders();
        
        // 直接保存禁用状态
        const settings = {
          enabled: false,
          interval: notificationInterval,
          smart: smartReminder,
          startHour: reminderStartHour,
          endHour: reminderEndHour
        };
        console.log('🔧 [SettingsScreen] 保存禁用设置:', settings);
        await StorageUtils.saveNotificationSettings(settings);
      }
    } catch (error) {
      console.error('设置通知失败:', error);
      showAlert('错误', '设置失败，请重试', 'error');
    }
  };

  // 更新通知间隔
  const updateNotificationInterval = async (interval) => {
    try {
      setNotificationInterval(interval);
      
      if (notificationEnabled) {
        console.log('🔧 [SettingsScreen] 更新通知间隔:', interval);
        
        // 使用通用方法检查目标状态并设置提醒
        await checkGoalStatusAndSetReminder('update_interval', { showAlert: false });
      }
      
      // 立即保存设置，使用新的interval值而不是state
      const settings = {
        enabled: notificationEnabled,
        interval: interval, // 使用参数中的新值
        smart: smartReminder,
        startHour: reminderStartHour,
        endHour: reminderEndHour
      };
      await StorageUtils.saveNotificationSettings(settings);
    } catch (error) {
      console.error('更新通知间隔失败:', error);
    }
  };

  // 切换智能提醒
  const toggleSmartReminder = async (enabled) => {
    try {
      setSmartReminder(enabled);
      
      if (notificationEnabled) {
        console.log('🔧 [SettingsScreen] 切换智能提醒模式:', enabled);
        
        // 使用通用方法检查目标状态并设置提醒
        await checkGoalStatusAndSetReminder('toggle_smart');
      } else {
        console.log('🔧 [SettingsScreen] 通知未开启，仅保存智能提醒设置');
      }
      
      // 立即保存设置，使用新的smart值而不是state
      const settings = {
        enabled: notificationEnabled,
        interval: notificationInterval,
        smart: enabled, // 使用参数中的新值
        startHour: reminderStartHour,
        endHour: reminderEndHour
      };
      await StorageUtils.saveNotificationSettings(settings);
    } catch (error) {
      console.error('切换智能提醒失败:', error);
      showAlert('错误', '切换失败，请重试', 'error');
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

  // 更新智能提醒时间范围
  const updateSmartReminderTime = async (startHour, endHour) => {
    try {
      if (notificationEnabled && smartReminder) {
        console.log('🔧 [SettingsScreen] 更新智能提醒时间范围:', { startHour, endHour });
        
        // 使用通用方法检查目标状态并设置提醒
        await checkGoalStatusAndSetReminder('update_time_range');
        
        // 立即保存设置，使用新的时间值而不是state
        const settings = {
          enabled: notificationEnabled,
          interval: notificationInterval,
          smart: smartReminder,
          startHour: startHour, // 使用参数中的新值
          endHour: endHour // 使用参数中的新值
        };
        await StorageUtils.saveNotificationSettings(settings);
      }
    } catch (error) {
      console.error('更新智能提醒时间失败:', error);
      showAlert('错误', '更新失败，请重试', 'error');
    }
  };

  // 编辑快捷添加选项
  const editQuickAddOption = (option) => {
    setEditingOption(option);
    setEditAmount(option.amount.toString());
    setShowQuickAddModal(true);
  };

  // 保存快捷添加选项
  const saveQuickAddOption = async () => {
    try {
      const amount = parseInt(editAmount);
      if (isNaN(amount) || amount <= 0 || amount > 9999) {
        showAlert('错误', '请输入有效的数量 (1-9999ml)', 'error');
        return;
      }

      const updatedOptions = quickAddOptions.map(option =>
        option.id === editingOption.id
          ? { ...option, amount, label: `${amount}ml` }
          : option
      );

      setQuickAddOptions(updatedOptions);
      await StorageUtils.saveQuickAddOptions(updatedOptions);
      setShowQuickAddModal(false);
      setEditingOption(null);
      setEditAmount('');
    } catch (error) {
      console.error('保存快捷添加选项失败:', error);
      showAlert('错误', '保存失败，请重试', 'error');
    }
  };

  // 恢复默认快捷添加选项
  const resetQuickAddOptions = () => {
    showConfirm(
      '确认重置',
      '这将恢复默认的快捷添加选项，确定要继续吗？',
      async () => {
        try {
          setQuickAddOptions(QUICK_ADD_OPTIONS);
          await StorageUtils.saveQuickAddOptions(QUICK_ADD_OPTIONS);
        } catch (error) {
          showAlert('错误', '重置失败', 'error');
        }
      }
    );
  };

  // 删除快捷添加选项
  const deleteQuickAddOption = (optionId) => {
    if (quickAddOptions.length <= 1) {
      showAlert('提示', '至少需要保留一个快捷添加选项', 'warning');
      return;
    }

    showConfirm(
      '确认删除',
      '确定要删除这个快捷添加选项吗？',
      async () => {
        try {
          const updatedOptions = quickAddOptions.filter(option => option.id !== optionId);
          setQuickAddOptions(updatedOptions);
          await StorageUtils.saveQuickAddOptions(updatedOptions);
        } catch (error) {
          showAlert('错误', '删除失败', 'error');
        }
      },
      { confirmText: '删除', cancelText: '取消' }
    );
  };

  // 添加新的快捷添加选项
  const addNewQuickAddOption = () => {
    if (quickAddOptions.length >= 8) {
      showAlert('提示', '最多只能添加8个快捷选项', 'warning');
      return;
    }

    setShowAddOptionModal(true);
  };

  // 保存新的快捷添加选项
  const saveNewQuickAddOption = async () => {
    try {
      const amount = parseInt(newOptionAmount);
      if (!amount || amount <= 0 || amount > 9999) {
        showAlert('错误', '请输入有效的饮水量 (1-9999ml)', 'error');
        return;
      }

      // 检查是否已存在相同数量的选项
      const existingOption = quickAddOptions.find(option => option.amount === amount);
      if (existingOption) {
        showAlert('提示', '该数量的选项已存在', 'warning');
        return;
      }

      const newId = Math.max(...quickAddOptions.map(o => o.id)) + 1;
      const newOption = {
        id: newId,
        amount,
        label: `${amount}ml`
      };
      
      const updatedOptions = [...quickAddOptions, newOption];
      setQuickAddOptions(updatedOptions);
      await StorageUtils.saveQuickAddOptions(updatedOptions);
      
      setShowAddOptionModal(false);
      setNewOptionAmount('');
    } catch (error) {
      console.error('添加新选项失败:', error);
      showAlert('错误', '添加失败，请重试', 'error');
    }
  };

  // 取消添加新选项
  const cancelAddNewOption = () => {
    setShowAddOptionModal(false);
    setNewOptionAmount('');
  };

  // 清除所有数据
  const clearAllData = () => {
    showConfirm(
      '确认清除',
      '这将删除所有饮水记录和设置，此操作不可恢复。',
      async () => {
        try {
          console.log('🗑️ [SettingsScreen] 开始清除所有数据...');
          
          // 首先取消所有通知
          console.log('🗑️ [SettingsScreen] 取消所有通知...');
          await NotificationUtils.cancelAllReminders();
          console.log('🗑️ [SettingsScreen] 已取消所有通知');
          
          // 清除存储的数据
          await StorageUtils.removeItem(STORAGE_KEYS.WATER_RECORDS);
          console.log('🗑️ [SettingsScreen] 已清除饮水记录');
          
          await StorageUtils.removeItem(STORAGE_KEYS.DAILY_GOAL);
          console.log('🗑️ [SettingsScreen] 已清除每日目标');
          
          await StorageUtils.removeItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
          console.log('🗑️ [SettingsScreen] 已清除通知设置');
          
          await StorageUtils.removeItem(STORAGE_KEYS.QUICK_ADD_OPTIONS);
          console.log('🗑️ [SettingsScreen] 已清除快捷添加选项');
          
          await StorageUtils.removeItem(STORAGE_KEYS.USER_PROFILE);
          console.log('🗑️ [SettingsScreen] 已清除用户配置');
          
          console.log('🗑️ [SettingsScreen] 所有数据清除完成');
          showAlert('成功', '所有数据已清除', 'success');
          
          // 重新加载设置
          await loadSettings();
        } catch (error) {
          console.error('🗑️ [SettingsScreen] 清除数据失败:', error);
          showAlert('错误', '清除数据失败', 'error');
        }
      },
      { confirmText: '确认', cancelText: '取消' }
    );
  };

  // 检查目标状态并决定是否设置提醒的通用方法
  const checkGoalStatusAndSetReminder = async (action = 'update', options = {}) => {
    try {
      console.log(`🔧 [SettingsScreen] 检查目标状态并设置提醒: ${action}`);
      
      // 检查今日目标是否已完成
      const todayRecords = await StorageUtils.getTodayWaterRecords();
      const dailyGoal = await StorageUtils.getDailyGoal() || 2000;
      const todayAmount = todayRecords.reduce((sum, record) => sum + record.amount, 0);
      
      console.log(`🔧 [SettingsScreen] 当前饮水状态: ${todayAmount}ml / ${dailyGoal}ml`);
      
      // 获取最后一次喝水记录的时间
      const lastDrinkTime = await NotificationUtils.getLastDrinkTime();
      
      const goalCompleted = todayAmount >= dailyGoal;
      
      if (goalCompleted) {
        console.log('🔧 [SettingsScreen] 目标已完成，取消现有提醒');
        await NotificationUtils.cancelAllReminders();
        
        // 根据不同的操作显示相应的消息
        const messages = {
          'enable_notification': '今日目标已完成，明天会自动开始提醒',
          'toggle_smart': '今日目标已完成，明天会使用新的提醒模式',
          'update_interval': '今日目标已完成，新间隔明天生效',
          'update_time_range': '今日目标已完成，明天会使用新的时间范围',
          'update_goal': '新目标已达成，已取消今日剩余提醒',
          'load_settings': null // 不显示消息
        };
        
        const message = messages[action];
        if (message && options.showAlert !== false) {
          const titles = {
            'enable_notification': '通知已开启',
            'toggle_smart': '智能提醒已切换',
            'update_interval': '间隔已更新',
            'update_time_range': '时间范围已更新',
            'update_goal': '目标已更新'
          };
          showAlert(titles[action] || '设置已更新', message, 'success');
        }
        
        return { goalCompleted: true, shouldSetReminder: false };
      } else {
        console.log('🔧 [SettingsScreen] 目标未完成，设置相应提醒');
        
        // 根据当前设置决定设置哪种提醒，优先使用最后喝水时间作为基础时间
        if (smartReminder) {
          await NotificationUtils.scheduleSmartReminder(
            notificationInterval,
            reminderStartHour,
            reminderEndHour,
            false, // resetFromNow
            lastDrinkTime // baseTime：最后喝水时间
          );
        } else {
          await NotificationUtils.scheduleWaterReminder(
            notificationInterval,
            lastDrinkTime // baseTime：最后喝水时间
          );
        }
        
        // 显示成功消息
        const successMessages = {
          'enable_notification': lastDrinkTime ? '喝水提醒已设置成功（基于最后喝水时间）' : '喝水提醒已设置成功',
          'toggle_smart': smartReminder ? '已切换为智能提醒模式' : '已切换为定时提醒模式',
          'update_interval': '新的提醒间隔已应用',
          'update_time_range': '智能提醒时间范围已应用',
          'update_goal': '目标未达成，提醒已重新设置'
        };
        
        const message = successMessages[action];
        if (message && options.showAlert !== false) {
          const titles = {
            'enable_notification': '通知已开启',
            'toggle_smart': smartReminder ? '智能提醒已开启' : '定时提醒已开启',
            'update_interval': '间隔已更新',
            'update_time_range': '时间范围已更新',
            'update_goal': '目标已更新'
          };
          showAlert(titles[action] || '设置已更新', message, 'success');
        }
        
        return { goalCompleted: false, shouldSetReminder: true };
      }
    } catch (error) {
      console.error('检查目标状态失败:', error);
      throw error;
    }
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
    <>
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
                  selectTextOnFocus={false}
                  selection={{start: dailyGoal.length, end: dailyGoal.length}}
                  contextMenuHidden={true}
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
                        selectTextOnFocus={false}
                        contextMenuHidden={true}
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
                        selectTextOnFocus={false}
                        contextMenuHidden={true}
                      />
                      <Text style={styles.timeUnit}>:00</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.timeUpdateButton}
                      onPress={() => updateSmartReminderTime(reminderStartHour, reminderEndHour)}
                    >
                      <Text style={styles.timeUpdateButtonText}>应用</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>

          {/* 快捷添加设置 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>快捷添加</Text>
            
            {renderSettingItem(
              '快捷添加选项',
              '自定义快捷添加按钮的数量',
              <View style={styles.quickAddContainer}>
                <View style={styles.quickAddGrid}>
                  {quickAddOptions.map((option) => (
                    <View key={option.id} style={styles.quickAddOptionRow}>
                      <View style={styles.quickAddOptionContainer}>
                        <TouchableOpacity
                          style={styles.quickAddOptionButton}
                          onPress={() => editQuickAddOption(option)}
                        >
                          <Text style={styles.quickAddOptionText}>{option.label}</Text>
                        </TouchableOpacity>
                        {quickAddOptions.length > 1 && (
                          <TouchableOpacity
                            style={styles.deleteOptionButton}
                            onPress={() => deleteQuickAddOption(option.id)}
                          >
                            <Text style={styles.deleteOptionText}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
                
                <View style={styles.quickAddActions}>
                  {quickAddOptions.length < 8 && (
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={addNewQuickAddOption}
                    >
                      <Text style={styles.addButtonText}>+ 添加选项</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={resetQuickAddOptions}
                  >
                    <Text style={styles.resetButtonText}>恢复默认</Text>
                  </TouchableOpacity>
                </View>
              </View>
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

          {/* 调试面板 - 仅在开发模式下显示 */}
          {__DEV__ && (
            <View style={[styles.section, styles.debugSection]}>
              <Text style={[styles.sectionTitle, styles.debugTitle]}>🔧 调试工具</Text>
              <Text style={styles.debugSubtitle}>开发模式专用功能</Text>
              
              <View style={styles.debugButtonsContainer}>
                <TouchableOpacity
                  style={[styles.debugButton, styles.debugButtonPrimary]}
                  onPress={async () => {
                    console.log('🧪 发送测试通知...');
                    await NotificationUtils.sendTestNotification();
                    showAlert('调试', '测试通知已发送', 'info');
                  }}
                >
                  <Text style={styles.debugButtonText}>发送测试通知</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.debugButton, styles.debugButtonSecondary]}
                  onPress={async () => {
                    console.log('⏰ 设置10秒后的测试通知...');
                    await NotificationUtils.scheduleTestNotification(10);
                    showAlert('调试', '10秒后会收到测试通知', 'info');
                  }}
                >
                  <Text style={styles.debugButtonText}>10秒延迟通知</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.debugButton, styles.debugButtonInfo]}
                  onPress={async () => {
                    console.log('📋 查看已安排的通知...');
                    const debugInfo = await NotificationUtils.getNotificationDebugInfo();
                    showAlert('调试信息', `当前有${debugInfo.length}个已安排的通知，详情请查看控制台`, 'info');
                  }}
                >
                  <Text style={styles.debugButtonText}>查看通知列表</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.debugButton, styles.debugButtonWarning]}
                  onPress={async () => {
                    console.log('🔄 重置通知系统...');
                    await NotificationUtils.resetNotifications();
                    showAlert('调试', '通知系统已重置', 'success');
                  }}
                >
                  <Text style={styles.debugButtonText}>重置通知系统</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.debugButton, styles.debugButtonSecondary]}
                  onPress={async () => {
                    console.log('🔐 检查通知权限...');
                    const hasPermission = await NotificationUtils.checkPermissionStatus();
                    showAlert('权限状态', hasPermission ? '通知权限正常' : '通知权限未授予', hasPermission ? 'success' : 'warning');
                  }}
                >
                  <Text style={styles.debugButtonText}>检查权限状态</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.debugButton, styles.debugButtonInfo]}
                  onPress={async () => {
                    console.log('🧪 模拟智能提醒（当前时间）...');
                    await NotificationUtils.debugSmartReminder();
                    showAlert('调试', '智能提醒模拟完成，详情请查看控制台', 'info');
                  }}
                >
                  <Text style={styles.debugButtonText}>模拟智能提醒</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.debugButton, styles.debugButtonPrimary]}
                  onPress={() => {
                    NotificationUtils.enableDebugMode();
                    showAlert('调试', '已开启详细日志模式', 'info');
                  }}
                >
                  <Text style={styles.debugButtonText}>开启详细日志</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.debugButton, styles.debugButtonSecondary]}
                  onPress={() => {
                    NotificationUtils.disableDebugMode();
                    showAlert('调试', '已关闭详细日志模式', 'info');
                  }}
                >
                  <Text style={styles.debugButtonText}>关闭详细日志</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.debugButton, styles.debugButtonWarning]}
                  onPress={async () => {
                    console.log('🔧 检查并修复异常通知...');
                    const fixedCount = await NotificationUtils.fixBrokenNotifications();
                    showAlert('修复完成', `已清理${fixedCount}个异常通知`, fixedCount > 0 ? 'success' : 'info');
                  }}
                >
                  <Text style={styles.debugButtonText}>修复异常通知</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.debugButton, styles.debugButtonInfo]}
                  onPress={async () => {
                    console.log('🔧 检查后台任务状态...');
                    const status = await BackgroundTaskUtils.getBackgroundTaskStatus();
                    const guidance = BackgroundTaskUtils.getBackgroundNotificationGuidance();
                    
                    const message = `后台任务状态: ${status.isRegistered ? '已注册' : '未注册'}\n\n` +
                      '📖 后台通知指南:\n' + guidance.join('\n');
                    
                    showAlert('后台通知帮助', message, 'info');
                  }}
                >
                  <Text style={styles.debugButtonText}>后台通知指南</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.debugButton, styles.debugButtonSecondary]}
                  onPress={async () => {
                    console.log('🔧 优化后台通知设置...');
                    const success = await BackgroundTaskUtils.optimizeNotificationsForBackground();
                    showAlert('优化完成', success ? '后台通知设置已优化' : '优化失败，请查看控制台', success ? 'success' : 'warning');
                  }}
                >
                  <Text style={styles.debugButtonText}>优化后台通知</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.debugButton, styles.debugButtonInfo]}
                  onPress={async () => {
                    console.log('🎯 测试目标完成时开启通知...');
                    
                    // 临时添加一条超过目标的记录来模拟目标完成
                    const testRecord = {
                      id: `test_${Date.now()}`,
                      amount: 3000, // 超过默认目标2000ml
                      timestamp: new Date().toISOString(),
                      date: new Date().toDateString()
                    };
                    
                    await StorageUtils.saveWaterRecord(testRecord);
                    console.log('📊 已添加测试记录，模拟目标完成状态');
                    
                    // 关闭再开启通知开关来测试
                    setNotificationEnabled(false);
                    setTimeout(async () => {
                      await toggleNotification(true);
                      
                      // 清理测试记录
                      const records = await StorageUtils.getWaterRecords();
                      const filteredRecords = records.filter(r => r.id !== testRecord.id);
                      await StorageUtils.setItem('water_records', filteredRecords);
                      console.log('🧹 已清理测试记录');
                    }, 500);
                  }}
                >
                  <Text style={styles.debugButtonText}>测试目标完成</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.debugButton, styles.debugButtonSecondary]}
                  onPress={async () => {
                    console.log('🗑️ 手动取消今日剩余提醒...');
                    NotificationUtils.enableDebugMode();
                    await NotificationUtils.cancelTodayReminders();
                    showAlert('操作完成', '已尝试取消今日剩余提醒，详情请查看控制台', 'info');
                  }}
                >
                  <Text style={styles.debugButtonText}>取消今日提醒</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.debugButton, styles.debugButtonPrimary]}
                  onPress={async () => {
                    console.log('🥤 测试喝水后重置提醒功能...');
                    NotificationUtils.enableDebugMode();
                    await NotificationUtils.resetReminderAfterDrinking();
                    showAlert('测试完成', '喝水后重置提醒测试已执行，请查看控制台详情', 'info');
                  }}
                >
                  <Text style={styles.debugButtonText}>测试喝水重置</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.debugButton, styles.debugButtonInfo]}
                  onPress={async () => {
                    console.log('🧠 测试智能提醒开关（目标完成）...');
                    
                    // 临时添加测试记录模拟目标完成
                    const testRecord = {
                      id: `test_smart_${Date.now()}`,
                      amount: 3000,
                      timestamp: new Date().toISOString(),
                      date: new Date().toDateString()
                    };
                    
                    await StorageUtils.saveWaterRecord(testRecord);
                    console.log('📊 已添加测试记录，模拟目标完成状态');
                    
                    // 切换智能提醒开关测试
                    const originalSmart = smartReminder;
                    await toggleSmartReminder(!originalSmart);
                    
                    setTimeout(async () => {
                      // 恢复原来的智能提醒状态
                      await toggleSmartReminder(originalSmart);
                      
                      // 清理测试记录
                      const records = await StorageUtils.getWaterRecords();
                      const filteredRecords = records.filter(r => r.id !== testRecord.id);
                      await StorageUtils.setItem('water_records', filteredRecords);
                      console.log('🧹 已清理测试记录并恢复原设置');
                    }, 1000);
                  }}
                >
                  <Text style={styles.debugButtonText}>测试智能开关</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.debugButton, styles.debugButtonWarning]}
                  onPress={async () => {
                    console.log('🎯 测试更新目标后的通知处理...');
                    
                    // 保存当前目标
                    const originalGoal = dailyGoal;
                    
                    // 临时设置一个很高的目标，让当前状态看起来已完成
                    setDailyGoal('500'); // 设置很低的目标，这样当前饮水量应该已经达成
                    
                    setTimeout(async () => {
                      // 触发保存目标
                      await saveDailyGoal();
                      
                      setTimeout(() => {
                        // 恢复原来的目标
                        setDailyGoal(originalGoal);
                        console.log('🔄 已恢复原目标设置');
                      }, 1000);
                    }, 500);
                  }}
                >
                  <Text style={styles.debugButtonText}>测试目标更新</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.debugButton, styles.debugButtonInfo]}
                  onPress={async () => {
                    console.log('🕐 测试基于最后喝水时间设置提醒...');
                    
                    // 获取当前的设置状态
                    const todayRecords = await StorageUtils.getTodayWaterRecords();
                    if (todayRecords.length === 0) {
                      showAlert('提示', '今日还没有饮水记录，将基于当前时间设置提醒', 'info');
                    } else {
                      const lastRecord = todayRecords[todayRecords.length - 1];
                      const lastDrinkTime = new Date(lastRecord.timestamp);
                      showAlert('测试信息', `将基于最后喝水时间 ${lastDrinkTime.toLocaleString('zh-CN')} 重新设置提醒`, 'info');
                    }
                    
                    // 执行测试
                    NotificationUtils.enableDebugMode();
                    await checkGoalStatusAndSetReminder('update_interval', { showAlert: false });
                    console.log('✅ 基于最后喝水时间的提醒设置测试完成');
                  }}
                >
                  <Text style={styles.debugButtonText}>测试基于最后喝水时间</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.debugTip}>
                💡 提示：这些功能仅在开发模式下可见，正式版本中不会显示
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* 编辑快捷添加选项Modal */}
      <Modal
        visible={showQuickAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQuickAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>编辑快捷添加</Text>
            <Text style={styles.modalSubtitle}>
              修改 {editingOption?.label} 的数量
            </Text>
            
            <TextInput
              style={styles.modalInput}
              value={editAmount}
              onChangeText={setEditAmount}
              placeholder="请输入数量"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="numeric"
              maxLength={4}
              autoFocus={true}
              selectTextOnFocus={false}
              contextMenuHidden={true}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowQuickAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={saveQuickAddOption}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.secondary]}
                  style={styles.confirmButtonGradient}
                >
                  <Text style={styles.confirmButtonText}>保存</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 添加新的快捷添加选项Modal */}
      <Modal
        visible={showAddOptionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddOptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>添加快捷选项</Text>
            <Text style={styles.modalSubtitle}>
              请输入新选项的饮水量 (ml)
            </Text>
            
            <TextInput
              style={styles.modalInput}
              value={newOptionAmount}
              onChangeText={setNewOptionAmount}
              placeholder="请输入饮水量"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="numeric"
              maxLength={4}
              autoFocus={true}
              selectTextOnFocus={false}
              contextMenuHidden={true}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddOptionModal(false)}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={saveNewQuickAddOption}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.secondary]}
                  style={styles.confirmButtonGradient}
                >
                  <Text style={styles.confirmButtonText}>保存</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* 自定义Alert */}
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        showCancel={alertConfig.showCancel}
      />
    </>
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
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 20,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: SIZES.borderRadius,
    backgroundColor: COLORS.background,
    marginRight: 10,
    marginBottom: 10,
    minWidth: 74
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
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 20,
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
  quickAddContainer: {
    flexDirection: 'column',
  },
  quickAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  quickAddOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 10,
  },
  quickAddOptionContainer: {
    position: 'relative',
  },
  quickAddOptionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: SIZES.borderRadius,
    backgroundColor: COLORS.background,
  },
  quickAddOptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  deleteOptionButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  deleteOptionText: {
    color: COLORS.surface,
    fontWeight: '600',
    fontSize: 10,
  },
  quickAddActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: SIZES.borderRadius,
    flex: 1,
    marginRight: 10,
  },
  addButtonText: {
    color: COLORS.surface,
    fontWeight: '600',
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: SIZES.borderRadius,
    flex: 1,
  },
  resetButtonText: {
    color: COLORS.surface,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  modalInput: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
    marginBottom: 20,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 20,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: SIZES.borderRadius,
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: COLORS.textSecondary,
  },
  cancelButtonText: {
    color: COLORS.surface,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 12,
  },
  confirmButton: {
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: COLORS.surface,
    fontWeight: '600',
  },
  timeUpdateButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: SIZES.borderRadius,
    marginLeft: 10,
  },
  timeUpdateButtonText: {
    color: COLORS.surface,
    fontWeight: '600',
    textAlign: 'center',
  },
  debugSection: {
    padding: SIZES.padding,
  },
  debugTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  debugSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  debugButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  debugButton: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: SIZES.borderRadius,
    marginRight: 10,
    marginBottom: 10,
  },
  debugButtonPrimary: {
    backgroundColor: COLORS.primary,
  },
  debugButtonSecondary: {
    backgroundColor: COLORS.secondary,
  },
  debugButtonInfo: {
    backgroundColor: COLORS.info,
  },
  debugButtonWarning: {
    backgroundColor: COLORS.warning,
  },
  debugButtonText: {
    color: COLORS.surface,
    fontWeight: '600',
    textAlign: 'center',
  },
  debugTip: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
}); 