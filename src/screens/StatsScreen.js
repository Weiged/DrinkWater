import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES, DEFAULT_DAILY_GOAL } from '../constants';
import { StorageUtils } from '../utils/storage';

const { width } = Dimensions.get('window');

export default function StatsScreen() {
  const [weekData, setWeekData] = useState([]);
  const [dailyGoal, setDailyGoal] = useState(DEFAULT_DAILY_GOAL);
  const [weeklyStats, setWeeklyStats] = useState({
    totalAmount: 0,
    averageAmount: 0,
    completedDays: 0,
    completionRate: 0
  });

  // 获取本周日期数组
  const getWeekDates = () => {
    const dates = [];
    const today = new Date();
    const currentDay = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // 加载数据
  const loadData = async () => {
    try {
      console.log('📊 [StatsScreen] 开始加载统计数据...');
      
      let goal = await StorageUtils.getDailyGoal();
      if (goal) {
        console.log(`📊 [StatsScreen] 获取每日目标: ${goal}ml`);
        setDailyGoal(goal);
      } else {
        // 如果没有设置目标，使用默认值
        goal = DEFAULT_DAILY_GOAL;
        console.log(`📊 [StatsScreen] 使用默认每日目标: ${goal}ml`);
        setDailyGoal(goal);
      }

      const weekRecords = await StorageUtils.getWeekWaterRecords();
      console.log(`📊 [StatsScreen] 获取本周记录: ${weekRecords.length} 条`);
      
      const weekDates = getWeekDates();
      
      // 按日期分组统计
      const dailyData = weekDates.map((date, index) => {
        const dateStr = date.toDateString();
        const dayRecords = weekRecords.filter(record => 
          new Date(record.timestamp).toDateString() === dateStr
        );
        const totalAmount = dayRecords.reduce((sum, record) => sum + record.amount, 0);
        
        return {
          date: dateStr,
          amount: totalAmount,
          day: date.toLocaleDateString('zh-CN', { weekday: 'short' }),
          dayNumber: date.getDate(),
          isToday: dateStr === new Date().toDateString()
        };
      });

      setWeekData(dailyData);

      // 计算统计数据 - 确保goal是一个有效的数字
      const validGoal = Number(goal) || DEFAULT_DAILY_GOAL;
      const totalAmount = dailyData.reduce((sum, day) => sum + day.amount, 0);
      const completedDays = dailyData.filter(day => {
        const completed = day.amount >= validGoal;
        console.log(`📊 [StatsScreen] ${day.day}: ${day.amount}ml ${completed ? '✅' : '❌'} (目标: ${validGoal}ml)`);
        return completed;
      }).length;
      const averageAmount = Math.round(totalAmount / 7);
      const completionRate = Math.round((completedDays / 7) * 100);

      console.log(`📊 [StatsScreen] 统计结果: 总量=${totalAmount}ml, 完成天数=${completedDays}天, 日均=${averageAmount}ml, 完成率=${completionRate}%`);

      setWeeklyStats({
        totalAmount,
        averageAmount,
        completedDays,
        completionRate
      });

    } catch (error) {
      console.error('📊 [StatsScreen] 加载统计数据失败:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      console.log('📊 [StatsScreen] 页面获取焦点，开始加载数据');
      // 强制重新设置初始状态
      setWeeklyStats({
        totalAmount: 0,
        averageAmount: 0,
        completedDays: 0,
        completionRate: 0
      });
      setWeekData([]);
      
      // 稍微延迟执行，确保状态重置完成
      const timer = setTimeout(() => {
        loadData();
      }, 100);
      
      return () => {
        console.log('📊 [StatsScreen] 页面失去焦点');
        clearTimeout(timer);
      };
    }, [])
  );

  // 渲染统计卡片
  const renderStatCard = (title, value, unit, color = COLORS.primary) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statTitle}>{title}</Text>
      <View style={styles.statValueContainer}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statUnit}>{unit}</Text>
      </View>
    </View>
  );

  // 渲染简单的柱状图
  const renderSimpleChart = () => {
    const maxAmount = Math.max(...weekData.map(day => day.amount), dailyGoal);
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>本周饮水趋势</Text>
        <View style={styles.chartWrapper}>
          <View style={styles.chartBars}>
            {weekData.map((day, index) => {
              const height = maxAmount > 0 ? (day.amount / maxAmount) * 150 : 0;
              const isCompleted = day.amount >= dailyGoal;
              
              return (
                <View key={index} style={styles.barContainer}>
                  <View style={styles.barWrapper}>
                    <View 
                      style={[
                        styles.bar,
                        {
                          height: height,
                          backgroundColor: isCompleted ? COLORS.success : COLORS.primary
                        }
                      ]}
                    />
                    <View 
                      style={[
                        styles.goalLine,
                        {
                          bottom: (dailyGoal / maxAmount) * 150
                        }
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, day.isToday && styles.todayLabel]}>
                    {day.day}
                  </Text>
                  <Text style={styles.barAmount}>{day.amount}ml</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.legendText}>未完成</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: COLORS.success }]} />
              <Text style={styles.legendText}>已完成</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine]} />
              <Text style={styles.legendText}>目标线</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // 渲染每日详情
  const renderDailyDetails = () => (
    <View style={styles.dailyDetailsSection}>
      <Text style={styles.sectionTitle}>每日详情</Text>
      {weekData.map((day, index) => {
        const percentage = Math.min((day.amount / dailyGoal) * 100, 100);
        const isCompleted = day.amount >= dailyGoal;
        
        return (
          <View key={index} style={styles.dailyItem}>
            <View style={styles.dailyInfo}>
              <Text style={[styles.dayName, day.isToday && styles.todayText]}>
                {day.day}
              </Text>
            </View>
            
            <View style={styles.dailyProgress}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${percentage}%`,
                      backgroundColor: isCompleted ? COLORS.success : COLORS.primary
                    }
                  ]} 
                />
              </View>
              <Text style={styles.dailyAmount}>{day.amount}ml</Text>
            </View>
            
            <View style={styles.dailyStatus}>
              {isCompleted ? (
                <Text style={styles.completedText}>✓</Text>
              ) : (
                <Text style={styles.incompleteText}>
                  {Math.round(percentage)}%
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 头部 */}
      <LinearGradient
        colors={COLORS.gradient}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>饮水统计</Text>
        <Text style={styles.headerSubtitle}>本周数据分析</Text>
      </LinearGradient>

      {/* 统计卡片 */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          {renderStatCard('总饮水量', weeklyStats.totalAmount, 'ml', COLORS.primary)}
          {renderStatCard('日均饮水', weeklyStats.averageAmount, 'ml', COLORS.secondary)}
        </View>
        <View style={styles.statsRow}>
          {renderStatCard('完成天数', weeklyStats.completedDays, '天', COLORS.success)}
          {renderStatCard('完成率', weeklyStats.completionRate, '%', COLORS.accent)}
        </View>
      </View>

      {/* 简单图表 */}
      {renderSimpleChart()}

      {/* 每日详情 */}
      {renderDailyDetails()}
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
  statsContainer: {
    padding: SIZES.padding,
    backgroundColor: COLORS.surface,
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 15,
    borderRadius: SIZES.borderRadius,
    marginHorizontal: 5,
    borderLeftWidth: 4,
  },
  statTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statUnit: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  chartContainer: {
    backgroundColor: COLORS.surface,
    padding: SIZES.padding,
    marginTop: 10,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  chartWrapper: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    width: '100%',
    height: 180,
    paddingHorizontal: 10,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  barWrapper: {
    position: 'relative',
    width: 30,
    height: 150,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 2,
  },
  goalLine: {
    position: 'absolute',
    left: -5,
    right: -5,
    height: 2,
    backgroundColor: COLORS.warning,
    borderRadius: 1,
  },
  barLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 5,
    fontWeight: '600',
  },
  todayLabel: {
    color: COLORS.primary,
  },
  barAmount: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 5,
  },
  legendLine: {
    width: 12,
    height: 2,
    backgroundColor: COLORS.warning,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  dailyDetailsSection: {
    backgroundColor: COLORS.surface,
    padding: SIZES.padding,
    marginTop: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  dailyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius,
    marginBottom: 8,
  },
  dailyInfo: {
    width: 60,
    alignItems: 'center',
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  todayText: {
    color: COLORS.primary,
  },
  dayDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dailyProgress: {
    flex: 1,
    marginHorizontal: 15,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  dailyAmount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  dailyStatus: {
    width: 40,
    alignItems: 'center',
  },
  completedText: {
    fontSize: 18,
    color: COLORS.success,
  },
  incompleteText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
}); 