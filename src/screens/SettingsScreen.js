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
import CustomAlert from '../utils/CustomAlert';
import { useCustomAlert } from '../utils/useCustomAlert';

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
      if (notificationSettings) {
        setNotificationEnabled(notificationSettings.enabled || false);
        setNotificationInterval(notificationSettings.interval || 60);
        setSmartReminder(notificationSettings.smart || true);
        setReminderStartHour(notificationSettings.startHour || 7);
        setReminderEndHour(notificationSettings.endHour || 22);
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
      showAlert('成功', '每日目标已保存', 'success');
    } catch (error) {
      console.error('保存目标失败:', error);
      showAlert('错误', '保存失败，请重试', 'error');
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
          showAlert('权限被拒绝', '请在设置中开启通知权限', 'warning');
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
      showAlert('错误', '设置失败，请重试', 'error');
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
          await StorageUtils.removeItem('water_records');
          await StorageUtils.removeItem('daily_goal');
          await StorageUtils.removeItem('notification_settings');
          showAlert('成功', '所有数据已清除', 'success');
          loadSettings();
        } catch (error) {
          showAlert('错误', '清除数据失败', 'error');
        }
      },
      { confirmText: '确认', cancelText: '取消' }
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
}); 