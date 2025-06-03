import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES, QUICK_ADD_OPTIONS, DEFAULT_DAILY_GOAL } from '../constants';
import { StorageUtils } from '../utils/storage';
import { NotificationUtils } from '../utils/notifications';
import WaterBallProgress from '../components/WaterBallProgress';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [dailyGoal, setDailyGoal] = useState(DEFAULT_DAILY_GOAL);
  const [todayAmount, setTodayAmount] = useState(0);
  const [todayRecords, setTodayRecords] = useState([]);
  const [quickAddOptions, setQuickAddOptions] = useState(QUICK_ADD_OPTIONS);

  // 加载数据
  const loadData = async () => {
    try {
      const goal = await StorageUtils.getDailyGoal();
      if (goal) setDailyGoal(goal);

      const records = await StorageUtils.getTodayWaterRecords();
      setTodayRecords(records);
      
      const total = records.reduce((sum, record) => sum + record.amount, 0);
      setTodayAmount(total);
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  };

  // 页面聚焦时重新加载数据
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // 添加饮水记录
  const addWaterRecord = async (amount) => {
    try {
      const record = {
        id: Date.now().toString(),
        amount,
        timestamp: new Date().toISOString(),
        date: new Date().toDateString()
      };

      await StorageUtils.saveWaterRecord(record);
      
      // 重新加载数据
      await loadData();
      
      // 检查是否达成目标
      const newTotal = todayAmount + amount;
      if (newTotal >= dailyGoal && todayAmount < dailyGoal) {
        await NotificationUtils.sendGoalAchievedNotification(newTotal, dailyGoal);
        Alert.alert('🎉 恭喜！', '今日饮水目标已达成！', [{ text: '太棒了！' }]);
      }
      
    } catch (error) {
      console.error('添加记录失败:', error);
      Alert.alert('错误', '添加记录失败，请重试');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 头部渐变背景 */}
      <LinearGradient
        colors={COLORS.gradient}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>今日饮水</Text>
        <Text style={styles.headerSubtitle}>保持健康饮水习惯</Text>
      </LinearGradient>

      {/* 进度显示 */}
      <View style={styles.progressSection}>
        <WaterBallProgress
          currentAmount={todayAmount}
          goalAmount={dailyGoal}
          size={250}
        />
        
        {/* 统计卡片 */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>{todayAmount}ml</Text>
            <Text style={styles.statCardLabel}>已完成</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>{Math.max(0, dailyGoal - todayAmount)}ml</Text>
            <Text style={styles.statCardLabel}>剩余</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>{todayRecords.length}</Text>
            <Text style={styles.statCardLabel}>记录次数</Text>
          </View>
        </View>
      </View>

      {/* 快捷添加按钮 */}
      <View style={styles.quickAddSection}>
        <Text style={styles.sectionTitle}>快捷添加</Text>
        <View style={styles.quickAddGrid}>
          {quickAddOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.quickAddButton}
              onPress={() => addWaterRecord(option.amount)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.secondary]}
                style={styles.quickAddGradient}
              >
                <Text style={styles.quickAddText}>{option.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 今日记录 */}
      <View style={styles.recordsSection}>
        <Text style={styles.sectionTitle}>今日记录</Text>
        {todayRecords.length > 0 ? (
          <View style={styles.recordsList}>
            {todayRecords.slice(-5).reverse().map((record) => (
              <View key={record.id} style={styles.recordItem}>
                <View style={styles.recordIcon}>
                  <Text style={styles.recordIconText}>💧</Text>
                </View>
                <View style={styles.recordInfo}>
                  <Text style={styles.recordAmount}>{record.amount}ml</Text>
                  <Text style={styles.recordTime}>
                    {new Date(record.timestamp).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyRecords}>
            <Text style={styles.emptyText}>今天还没有饮水记录</Text>
            <Text style={styles.emptySubtext}>点击上方按钮开始记录吧！</Text>
          </View>
        )}
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
  progressSection: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: COLORS.surface,
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 15,
    borderRadius: SIZES.borderRadius,
    marginHorizontal: 5,
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statCardLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  quickAddSection: {
    padding: SIZES.padding,
    backgroundColor: COLORS.surface,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  quickAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAddButton: {
    width: (width - SIZES.padding * 2 - 10) / 2,
    marginBottom: 10,
    borderRadius: SIZES.borderRadius,
    overflow: 'hidden',
  },
  quickAddGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.surface,
  },
  recordsSection: {
    padding: SIZES.padding,
    backgroundColor: COLORS.surface,
    marginTop: 10,
    marginBottom: 20,
  },
  recordsList: {
    marginTop: 10,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
    marginBottom: 8,
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  recordIconText: {
    fontSize: 20,
  },
  recordInfo: {
    flex: 1,
  },
  recordAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  recordTime: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emptyRecords: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    opacity: 0.7,
  },
}); 