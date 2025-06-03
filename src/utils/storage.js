import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';

export const StorageUtils = {
  // 保存数据
  async setItem(key, value) {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error('保存数据失败:', error);
    }
  },

  // 获取数据
  async getItem(key) {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('获取数据失败:', error);
      return null;
    }
  },

  // 删除数据
  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('删除数据失败:', error);
    }
  },

  // 保存每日目标
  async saveDailyGoal(goal) {
    await this.setItem(STORAGE_KEYS.DAILY_GOAL, goal);
  },

  // 获取每日目标
  async getDailyGoal() {
    return await this.getItem(STORAGE_KEYS.DAILY_GOAL);
  },

  // 保存饮水记录
  async saveWaterRecord(record) {
    try {
      const existingRecords = await this.getWaterRecords() || [];
      const updatedRecords = [...existingRecords, record];
      await this.setItem(STORAGE_KEYS.WATER_RECORDS, updatedRecords);
    } catch (error) {
      console.error('保存饮水记录失败:', error);
    }
  },

  // 获取饮水记录
  async getWaterRecords() {
    return await this.getItem(STORAGE_KEYS.WATER_RECORDS);
  },

  // 获取今日饮水记录
  async getTodayWaterRecords() {
    try {
      const allRecords = await this.getWaterRecords() || [];
      const today = new Date().toDateString();
      return allRecords.filter(record => 
        new Date(record.timestamp).toDateString() === today
      );
    } catch (error) {
      console.error('获取今日记录失败:', error);
      return [];
    }
  },

  // 获取本周饮水记录
  async getWeekWaterRecords() {
    try {
      const allRecords = await this.getWaterRecords() || [];
      const now = new Date();
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      weekStart.setHours(0, 0, 0, 0);
      
      return allRecords.filter(record => 
        new Date(record.timestamp) >= weekStart
      );
    } catch (error) {
      console.error('获取本周记录失败:', error);
      return [];
    }
  },

  // 保存通知设置
  async saveNotificationSettings(settings) {
    await this.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, settings);
  },

  // 获取通知设置
  async getNotificationSettings() {
    return await this.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
  },

  // 保存快捷添加选项
  async saveQuickAddOptions(options) {
    await this.setItem(STORAGE_KEYS.QUICK_ADD_OPTIONS, options);
  },

  // 获取快捷添加选项
  async getQuickAddOptions() {
    return await this.getItem(STORAGE_KEYS.QUICK_ADD_OPTIONS);
  }
}; 