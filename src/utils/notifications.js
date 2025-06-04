import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 配置通知处理 - 简化版本，不做智能检查
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const notificationType = notification.request.content.data?.type;
    const now = new Date();
    console.log(`收到通知，类型: ${notificationType}，时间: ${now.toLocaleTimeString()}`);
    
    // 根据通知类型决定显示方式
    let shouldShowInList = false;
    if (notificationType === 'water_reminder' || notificationType === 'smart_reminder') {
      shouldShowInList = true;
    } else if (notificationType === 'goal_achieved') {
      shouldShowInList = false;
    }
    
    console.log('是否显示在通知列表:', shouldShowInList);
    
    return {
      shouldShowBanner: true,
      shouldShowList: shouldShowInList,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  },
});

export const NotificationUtils = {
  // 获取最后一次喝水记录的时间
  async getLastDrinkTime() {
    try {
      // 动态导入StorageUtils避免循环依赖
      const { StorageUtils } = await import('./storage');
      
      const todayRecords = await StorageUtils.getTodayWaterRecords();
      if (todayRecords.length > 0) {
        const lastRecord = todayRecords[todayRecords.length - 1];
        const lastDrinkTime = new Date(lastRecord.timestamp);
        console.log(`🔧 最后喝水时间: ${lastDrinkTime.toLocaleString('zh-CN')}`);
        return lastDrinkTime;
      } else {
        console.log('🔧 今日暂无饮水记录');
        return null;
      }
    } catch (error) {
      console.error('获取最后喝水时间失败:', error);
      return null;
    }
  },

  // 请求通知权限
  async requestPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('通知权限被拒绝');
        return false;
      }
      
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('water-reminder', {
          name: '喝水提醒',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4FC3F7',
        });
      }
      
      return true;
    } catch (error) {
      console.error('请求通知权限失败:', error);
      return false;
    }
  },

  // 发送即时通知
  async sendNotification(title, body) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          data: { type: 'water_reminder' },
        },
        trigger: null, // 立即发送
      });
    } catch (error) {
      console.error('发送通知失败:', error);
    }
  },

  // 设置定时提醒
  async scheduleWaterReminder(intervalMinutes = 60, baseTime = null) {
    try {
      this._debugLog('开始设置定时提醒', { intervalMinutes, baseTime });
      
      // 先取消所有现有的提醒
      await this.cancelAllReminders();
      
      if (baseTime) {
        // 如果提供了基础时间，从基础时间开始计算下一次提醒
        const nextReminderTime = new Date(baseTime);
        nextReminderTime.setMinutes(nextReminderTime.getMinutes() + intervalMinutes);
        nextReminderTime.setSeconds(0, 0); // 重置秒和毫秒
        
        const now = new Date();
        console.log(`🔄 基于最后喝水时间(${baseTime.toLocaleString('zh-CN')})设置提醒，下次提醒时间: ${nextReminderTime.toLocaleString('zh-CN')}`);
        
        // 如果计算出的下次提醒时间已经过了，则从当前时间开始
        if (nextReminderTime <= now) {
          console.log('⚠️ 计算出的提醒时间已过期，从当前时间重新计算');
          nextReminderTime.setTime(now.getTime() + intervalMinutes * 60 * 1000);
        }
        
        // 设置从指定时间开始的第一个提醒
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '💧 该喝水啦！',
            body: '记得补充水分，保持身体健康～',
            sound: 'default',
            data: { type: 'water_reminder', baseTime: baseTime.getTime() },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: nextReminderTime,
          },
        });
        
        // 设置后续的重复提醒
        const trigger = {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: intervalMinutes * 60,
          repeats: true,
        };
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '💧 该喝水啦！',
            body: '记得补充水分，保持身体健康～',
            sound: 'default',
            data: { type: 'water_reminder' },
          },
          trigger,
        });
        
        console.log(`已设置定时提醒：基于 ${baseTime.toLocaleString('zh-CN')}，每${intervalMinutes}分钟提醒一次`);
      } else {
        // 原有逻辑：从现在开始设置提醒
        const trigger = {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: intervalMinutes * 60,
          repeats: true,
        };
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '💧 该喝水啦！',
            body: '记得补充水分，保持身体健康～',
            sound: 'default',
            data: { type: 'water_reminder' },
          },
          trigger,
        });
        
        console.log(`已设置每${intervalMinutes}分钟的喝水提醒（从当前时间开始）`);
      }
      
      this._debugLog('定时提醒设置完成', { intervalMinutes, baseTime });
    } catch (error) {
      console.error('设置提醒失败:', error);
      this._debugLog('设置提醒失败', { error: error.message });
    }
  },

  // 设置智能提醒（每日动态安排）
  async scheduleSmartReminder(intervalMinutes = 60, startHour = 7, endHour = 22, resetFromNow = false, baseTime = null) {
    try {
      this._debugLog('开始设置智能提醒', { intervalMinutes, startHour, endHour, resetFromNow, baseTime });
      
      await this.cancelAllReminders();
      
      // 计算今天剩余的提醒时间点
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const reminders = [];
      
      this._debugLog('当前时间信息', {
        now: now.toLocaleString('zh-CN'),
        today: today.toLocaleString('zh-CN'),
        currentHour: now.getHours(),
        baseTime: baseTime ? baseTime.toLocaleString('zh-CN') : null
      });
      
      // 生成今天的提醒时间点
      let currentTime = new Date(today);
      
      if (baseTime && !resetFromNow) {
        // 如果提供了基础时间（最后喝水时间），从基础时间开始计算
        console.log('🔄 基于最后喝水时间重新计算智能提醒间隔');
        currentTime = new Date(baseTime);
        currentTime.setMinutes(currentTime.getMinutes() + intervalMinutes);
        currentTime.setSeconds(0, 0); // 重置秒和毫秒
        
        // 如果计算出的时间已经过了，从当前时间开始
        if (currentTime <= now) {
          console.log('⚠️ 基于最后喝水时间计算的提醒时间已过期，从当前时间重新计算');
          currentTime = new Date(now);
          currentTime.setMinutes(currentTime.getMinutes() + intervalMinutes);
          currentTime.setSeconds(0, 0);
        }
      } else if (resetFromNow) {
        // 从当前时间开始计算下一个提醒
        console.log('🔄 从当前时间重新计算提醒间隔');
        currentTime = new Date(now);
        currentTime.setMinutes(currentTime.getMinutes() + intervalMinutes);
        currentTime.setSeconds(0, 0); // 重置秒和毫秒
      } else {
        // 按固定时间点安排
        currentTime.setHours(startHour, 0, 0, 0); // 从开始小时的整点开始
      }
      
      const endTime = new Date(today);
      endTime.setHours(endHour, 59, 59, 999); // 到结束小时的最后
      
      this._debugLog('时间范围计算', {
        startTime: currentTime.toLocaleString('zh-CN'),
        endTime: endTime.toLocaleString('zh-CN'),
        intervalMinutes,
        resetFromNow,
        baseTime: baseTime ? baseTime.toLocaleString('zh-CN') : null
      });
      
      if (resetFromNow || baseTime) {
        // 从当前时间或基础时间开始，只需要安排剩余时间内的提醒
        while (currentTime <= endTime) {
          this._debugLog('检查提醒时间', {
            currentTime: currentTime.toLocaleString('zh-CN'),
            isAfterNow: currentTime > now
          });
          
          // 如果在有效时间范围内且时间还没到，添加到提醒列表
          if (currentTime > now && currentTime.getHours() >= startHour && currentTime.getHours() <= endHour) {
            reminders.push(new Date(currentTime));
          }
          
          // 增加间隔时间
          currentTime.setMinutes(currentTime.getMinutes() + intervalMinutes);
        }
      } else {
        // 按间隔时间生成提醒点（原逻辑）
        while (currentTime <= endTime) {
          this._debugLog('检查提醒时间', {
            currentTime: currentTime.toLocaleString('zh-CN'),
            isAfterNow: currentTime > now
          });
          
          // 如果时间还没到，添加到提醒列表
          if (currentTime > now) {
            reminders.push(new Date(currentTime));
          }
          
          // 增加间隔时间
          currentTime.setMinutes(currentTime.getMinutes() + intervalMinutes);
        }
      }
      
      this._debugLog('计算出的提醒时间点', { 
        count: reminders.length, 
        times: reminders.map(t => t.toLocaleString('zh-CN'))
      });
      
      // 安排今天剩余的提醒
      for (const reminderTime of reminders) {
        this._debugLog('安排提醒', {
          time: reminderTime.toLocaleString('zh-CN'),
          timestamp: reminderTime.getTime()
        });
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '💧 喝水时间到！',
            body: '别忘了补充水分哦～',
            sound: 'default',
            data: { type: 'smart_reminder' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderTime,
          },
        });
      }
      
      // 设置每日重新安排提醒的任务（第二天早上的设置时间）
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '系统提醒',
          body: '重新安排今日喝水提醒',
          sound: null,
          data: { type: 'schedule_setup' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: startHour - 1 > 0 ? startHour - 1 : 6, // 确保不会是负数
          minute: 0,
          repeats: true,
        },
      });
      
      const modeText = resetFromNow ? '（从当前时间重新计算）' : 
                      baseTime ? `（基于最后喝水时间：${baseTime.toLocaleString('zh-CN')}）` : 
                      '（按标准时间表）';
      console.log(`已设置智能提醒：今天剩余${reminders.length}个提醒，间隔${intervalMinutes}分钟${modeText}`);
      this._debugLog('智能提醒设置完成', { 
        reminderCount: reminders.length,
        intervalMinutes,
        resetFromNow,
        baseTime: baseTime ? baseTime.toLocaleString('zh-CN') : null,
        nextSetupTime: `${startHour - 1 > 0 ? startHour - 1 : 6}:00`
      });
    } catch (error) {
      console.error('设置智能提醒失败:', error);
      this._debugLog('设置智能提醒失败', { error: error.message });
    }
  },

  // 取消所有提醒
  async cancelAllReminders() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('已取消所有提醒');
    } catch (error) {
      console.error('取消提醒失败:', error);
    }
  },

  // 获取所有已安排的通知
  async getScheduledNotifications() {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('获取通知列表失败:', error);
      return [];
    }
  },

  // 发送鼓励通知
  async sendEncouragementNotification(currentAmount, goal) {
    const remaining = goal - currentAmount;
    const percentage = Math.round((currentAmount / goal) * 100);
    
    let message = '';
    if (percentage < 25) {
      message = `加油！还需要 ${remaining}ml 就能完成今日目标`;
    } else if (percentage < 50) {
      message = `不错哦！已完成 ${percentage}%，继续努力`;
    } else if (percentage < 75) {
      message = `很棒！已完成大半目标，再坚持一下`;
    } else {
      message = `太棒了！即将完成目标，最后 ${remaining}ml`;
    }
    
    await this.sendNotification('💪 继续加油！', message);
  },

  // 手动检查并更新今日提醒（app启动时调用）
  async updateTodayReminders() {
    try {
      this._debugLog('开始检查今日提醒状态');
      
      // 动态导入StorageUtils避免循环依赖
      const { StorageUtils } = await import('./storage');
      
      // 获取通知设置
      const notificationSettings = await StorageUtils.getNotificationSettings();
      if (!notificationSettings?.enabled) {
        this._debugLog('通知未启用，跳过检查');
        return;
      }
      
      // 获取当天饮水记录和目标
      const todayRecords = await StorageUtils.getTodayWaterRecords();
      const dailyGoal = await StorageUtils.getDailyGoal() || 2000;
      const todayAmount = todayRecords.reduce((sum, record) => sum + record.amount, 0);
      
      console.log(`📊 当前饮水状态: ${todayAmount}ml / ${dailyGoal}ml`);
      this._debugLog('饮水状态检查', {
        todayAmount,
        dailyGoal,
        recordsCount: todayRecords.length,
        isGoalAchieved: todayAmount >= dailyGoal
      });
      
      // 如果已达目标，取消今天剩余的提醒
      if (todayAmount >= dailyGoal) {
        console.log('🎉 今日目标已达成，取消剩余提醒');
        await this.cancelTodayReminders();
        return;
      }
      
      console.log(`💧 目标未达成，还需 ${dailyGoal - todayAmount}ml`);
      
      // 获取最后一次喝水记录的时间
      const lastDrinkTime = await this.getLastDrinkTime();
      
      // 重新设置智能提醒
      if (notificationSettings.smart) {
        console.log('🔄 重新设置智能提醒（基于最后喝水时间）');
        await this.scheduleSmartReminder(
          notificationSettings.interval,
          notificationSettings.startHour,
          notificationSettings.endHour,
          false, // resetFromNow
          lastDrinkTime // baseTime：最后喝水时间
        );
      }
      
      this._debugLog('今日提醒检查完成');
      
    } catch (error) {
      console.error('更新今日提醒失败:', error);
      this._debugLog('更新今日提醒失败', { error: error.message });
    }
  },

  // 取消今天剩余的提醒
  async cancelTodayReminders() {
    try {
      const scheduled = await this.getScheduledNotifications();
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      this._debugLog('开始取消今天剩余的提醒', {
        now: now.toLocaleString('zh-CN'),
        today: today.toLocaleString('zh-CN'),
        tomorrow: tomorrow.toLocaleString('zh-CN'),
        totalScheduled: scheduled.length
      });
      
      let canceledCount = 0;
      
      for (const notification of scheduled) {
        const trigger = notification.trigger;
        if (trigger && trigger.type === 'date' && trigger.value) {
          // 修复时间戳转换逻辑
          let triggerDate;
          const timestamp = trigger.value;
          
          if (timestamp > 10000000000) {
            // 毫秒级时间戳
            triggerDate = new Date(timestamp);
          } else {
            // 秒级时间戳
            triggerDate = new Date(timestamp * 1000);
          }
          
          this._debugLog('检查通知', {
            id: notification.identifier,
            title: notification.content.title,
            triggerTime: triggerDate.toLocaleString('zh-CN'),
            isToday: triggerDate >= today && triggerDate < tomorrow,
            isAfterNow: triggerDate > now
          });
          
          // 如果是今天的提醒且还未触发，取消它
          if (triggerDate >= today && triggerDate < tomorrow && triggerDate > now) {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
            canceledCount++;
            console.log(`✅ 已取消今天的提醒: ${triggerDate.toLocaleTimeString('zh-CN')}`);
          }
        }
      }
      
      console.log(`已取消今天剩余的${canceledCount}个提醒`);
      this._debugLog('取消今天提醒完成', { canceledCount });
    } catch (error) {
      console.error('取消今天提醒失败:', error);
      this._debugLog('取消今天提醒失败', { error: error.message });
    }
  },

  // 🔧 调试工具函数
  
  // 获取所有已安排通知的详细信息
  async getNotificationDebugInfo() {
    try {
      const scheduled = await this.getScheduledNotifications();
      const now = new Date();
      
      const debugInfo = scheduled.map(notification => {
        const trigger = notification.trigger;
        let triggerInfo = '未知触发器';
        
        if (trigger) {
          if (trigger.type === 'date') {
            // 处理绝对时间触发器
            let triggerDate;
            if (trigger.value) {
              // trigger.value可能是秒级时间戳或毫秒级时间戳
              const timestamp = trigger.value;
              if (timestamp > 10000000000) {
                // 毫秒级时间戳
                triggerDate = new Date(timestamp);
              } else {
                // 秒级时间戳
                triggerDate = new Date(timestamp * 1000);
              }
            } else if (trigger.dateComponents) {
              // iOS可能使用dateComponents
              triggerDate = new Date(trigger.dateComponents);
            } else {
              triggerDate = new Date();
            }
            
            triggerInfo = `定时: ${triggerDate.toLocaleString('zh-CN')}`;
          } else if (trigger.type === 'timeInterval') {
            triggerInfo = `间隔: ${trigger.seconds}秒 (${Math.round(trigger.seconds / 60)}分钟)`;
          } else if (trigger.type === 'daily') {
            triggerInfo = `每日: ${trigger.hour}:${trigger.minute.toString().padStart(2, '0')}`;
          } else if (trigger.type === 'calendar') {
            triggerInfo = `日历触发器`;
          }
        }
        
        return {
          id: notification.identifier,
          title: notification.content.title,
          body: notification.content.body,
          type: notification.content.data?.type || '未知',
          trigger: triggerInfo,
          raw: {
            trigger: trigger,
            content: notification.content
          }
        };
      });
      
      console.log('📋 当前已安排的通知:');
      debugInfo.forEach((info, index) => {
        console.log(`${index + 1}. [${info.type}] ${info.title}`);
        console.log(`   内容: ${info.body}`);
        console.log(`   触发: ${info.trigger}`);
        console.log(`   ID: ${info.id}`);
        console.log('');
      });
      
      // 额外输出原始trigger信息用于调试
      if (this._debugMode) {
        console.log('🔍 原始trigger信息:');
        debugInfo.forEach((info, index) => {
          console.log(`${index + 1}. 原始trigger:`, info.raw.trigger);
        });
      }
      
      return debugInfo;
    } catch (error) {
      console.error('获取调试信息失败:', error);
      return [];
    }
  },

  // 发送测试通知
  async sendTestNotification() {
    try {
      await this.sendNotification('🧪 测试通知', '这是一个测试通知，用于验证通知功能是否正常');
      console.log('✅ 测试通知已发送');
    } catch (error) {
      console.error('❌ 发送测试通知失败:', error);
    }
  },

  // 设置延迟测试通知（用于测试定时功能）
  async scheduleTestNotification(delaySeconds = 10) {
    try {
      const trigger = {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: delaySeconds,
        repeats: false,
      };
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ 延迟测试通知',
          body: `这是${delaySeconds}秒后的测试通知`,
          sound: 'default',
          data: { type: 'test_delayed' },
        },
        trigger,
      });
      
      console.log(`✅ 已安排${delaySeconds}秒后的测试通知`);
    } catch (error) {
      console.error('❌ 安排测试通知失败:', error);
    }
  },

  // 清理所有通知并重新设置（用于调试）
  async resetNotifications() {
    try {
      console.log('🔄 开始重置通知系统...');
      
      // 取消所有现有通知
      await this.cancelAllReminders();
      console.log('✅ 已清除所有现有通知');
      
      // 动态导入StorageUtils
      const { StorageUtils } = await import('./storage');
      
      // 重新读取设置并应用
      const notificationSettings = await StorageUtils.getNotificationSettings();
      if (notificationSettings?.enabled) {
        console.log('📱 重新应用通知设置:', notificationSettings);
        
        // 获取最后喝水时间
        const lastDrinkTime = await this.getLastDrinkTime();
        
        if (notificationSettings.smart) {
          await this.scheduleSmartReminder(
            notificationSettings.interval,
            notificationSettings.startHour,
            notificationSettings.endHour,
            false, // resetFromNow
            lastDrinkTime // baseTime
          );
        } else {
          await this.scheduleWaterReminder(
            notificationSettings.interval,
            lastDrinkTime // baseTime
          );
        }
      }
      
      console.log('🎉 通知系统重置完成');
    } catch (error) {
      console.error('❌ 重置通知系统失败:', error);
    }
  },

  // 模拟不同时间的智能提醒（调试用）
  async debugSmartReminder(testHour = null) {
    try {
      const now = new Date();
      const testTime = testHour ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), testHour) : now;
      
      console.log(`🧪 模拟时间: ${testTime.toLocaleString('zh-CN')}`);
      
      // 模拟智能提醒逻辑
      const startHour = 7;
      const endHour = 22;
      const intervalMinutes = 60;
      
      const today = new Date(testTime.getFullYear(), testTime.getMonth(), testTime.getDate());
      const reminders = [];
      
      console.log(`📊 参数信息:`);
      console.log(`   活跃时段: ${startHour}:00 - ${endHour}:00`);
      console.log(`   提醒间隔: ${intervalMinutes}分钟`);
      console.log(`   今天日期: ${today.toDateString()}`);
      console.log(`   当前时间: ${testTime.toLocaleString('zh-CN')}`);
      
      // 使用与scheduleSmartReminder相同的逻辑
      let currentTime = new Date(today);
      currentTime.setHours(startHour, 0, 0, 0);
      
      const endTime = new Date(today);
      endTime.setHours(endHour, 59, 59, 999);
      
      console.log(`📍 时间范围: ${currentTime.toLocaleString('zh-CN')} ~ ${endTime.toLocaleString('zh-CN')}`);
      
      while (currentTime <= endTime) {
        const isAfter = currentTime > testTime;
        const status = isAfter ? '✅ 将安排' : '❌ 已过期';
        
        console.log(`   ${currentTime.toLocaleTimeString('zh-CN')} - ${status}`);
        
        if (isAfter) {
          reminders.push(new Date(currentTime));
        }
        
        // 增加间隔时间
        currentTime.setMinutes(currentTime.getMinutes() + intervalMinutes);
      }
      
      console.log(`📅 剩余提醒时间点 (共${reminders.length}个):`);
      reminders.forEach((time, index) => {
        console.log(`${index + 1}. ${time.toLocaleString('zh-CN')}`);
      });
      
      return reminders;
    } catch (error) {
      console.error('❌ 调试智能提醒失败:', error);
      return [];
    }
  },

  // 检查通知权限状态
  async checkPermissionStatus() {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      console.log('🔐 通知权限状态:', status);
      
      if (Platform.OS === 'android') {
        // Android额外检查
        console.log('📱 Android平台通知检查完成');
      }
      
      return status === 'granted';
    } catch (error) {
      console.error('❌ 检查权限状态失败:', error);
      return false;
    }
  },

  // 开启详细日志模式
  enableDebugMode() {
    console.log('🔍 已开启通知调试模式');
    this._debugMode = true;
  },

  // 关闭详细日志模式
  disableDebugMode() {
    console.log('🔇 已关闭通知调试模式');
    this._debugMode = false;
  },

  // 调试日志输出
  _debugLog(message, ...args) {
    if (this._debugMode) {
      console.log(`[NotificationDebug] ${message}`, ...args);
    }
  },

  // 检查并修复异常的通知时间
  async fixBrokenNotifications() {
    try {
      console.log('🔧 开始检查并修复异常通知...');
      
      const scheduled = await this.getScheduledNotifications();
      const now = new Date();
      const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      
      let fixedCount = 0;
      
      for (const notification of scheduled) {
        const trigger = notification.trigger;
        if (trigger && trigger.type === 'date' && trigger.value) {
          let triggerDate;
          const timestamp = trigger.value;
          
          if (timestamp > 10000000000) {
            triggerDate = new Date(timestamp);
          } else {
            triggerDate = new Date(timestamp * 1000);
          }
          
          // 检查是否是异常时间（太遥远的未来或过去）
          const isAbnormal = triggerDate.getFullYear() < 2020 || 
                           triggerDate.getFullYear() > 2030 ||
                           triggerDate < now;
          
          if (isAbnormal) {
            console.log(`🚨 发现异常通知: ${notification.identifier}`);
            console.log(`   标题: ${notification.content.title}`);
            console.log(`   异常时间: ${triggerDate.toLocaleString('zh-CN')}`);
            
            // 取消异常通知
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
            fixedCount++;
          }
        }
      }
      
      console.log(`✅ 修复完成，清理了${fixedCount}个异常通知`);
      
      // 重新设置正常的通知
      if (fixedCount > 0) {
        await this.resetNotifications();
      }
      
      return fixedCount;
    } catch (error) {
      console.error('❌ 修复通知失败:', error);
      return 0;
    }
  },

  // 喝水后重新设置提醒（从当前时间开始计算）
  async resetReminderAfterDrinking() {
    try {
      this._debugLog('用户喝水后重新设置提醒');
      
      // 动态导入StorageUtils避免循环依赖
      const { StorageUtils } = await import('./storage');
      
      // 获取通知设置
      const notificationSettings = await StorageUtils.getNotificationSettings();
      if (!notificationSettings?.enabled) {
        this._debugLog('通知未启用，跳过重新设置');
        return;
      }
      
      // 检查当前饮水状态
      const todayRecords = await StorageUtils.getTodayWaterRecords();
      const dailyGoal = await StorageUtils.getDailyGoal() || 2000;
      const todayAmount = todayRecords.reduce((sum, record) => sum + record.amount, 0);
      
      console.log(`💧 喝水后检查状态: ${todayAmount}ml / ${dailyGoal}ml`);
      
      // 如果已达目标，取消所有提醒
      if (todayAmount >= dailyGoal) {
        console.log('🎉 目标已达成，取消剩余提醒');
        await this.cancelAllReminders();
        return;
      }
      
      // 根据提醒类型重新设置
      if (notificationSettings.smart) {
        console.log('🔄 重新设置智能提醒（从当前时间开始）');
        await this.scheduleSmartReminder(
          notificationSettings.interval,
          notificationSettings.startHour,
          notificationSettings.endHour,
          true // resetFromNow = true，从当前时间开始计算
        );
      } else {
        console.log('🔄 重新设置定时提醒（从当前时间开始）');
        await this.scheduleWaterReminder(notificationSettings.interval);
      }
      
      console.log(`✅ 已重新设置提醒，间隔${notificationSettings.interval}分钟`);
      
    } catch (error) {
      console.error('重新设置提醒失败:', error);
      this._debugLog('重新设置提醒失败', { error: error.message });
    }
  },

  // 测试喝水后重置提醒
  async testDrinkingReset() {
    console.log('�� 测试喝水后重置提醒功能...');
    NotificationUtils.enableDebugMode();
    await NotificationUtils.resetReminderAfterDrinking();
    showAlert('测试完成', '喝水后重置提醒测试已执行，请查看控制台详情', 'info');
  },
};

// 🚀 全局调试函数 - 开发模式下可在控制台直接调用
if (__DEV__) {
  global.debugNotifications = {
    // 快速查看所有通知
    async list() {
      return await NotificationUtils.getNotificationDebugInfo();
    },
    
    // 快速发送测试通知
    async test() {
      await NotificationUtils.sendTestNotification();
    },
    
    // 快速重置
    async reset() {
      await NotificationUtils.resetNotifications();
    },
    
    // 检查权限
    async permission() {
      return await NotificationUtils.checkPermissionStatus();
    },
    
    // 延迟测试
    async delay(seconds = 10) {
      await NotificationUtils.scheduleTestNotification(seconds);
    },
    
    // 模拟智能提醒
    async smart(hour) {
      return await NotificationUtils.debugSmartReminder(hour);
    },
    
    // 开启调试日志
    enableLog() {
      NotificationUtils.enableDebugMode();
    },
    
    // 关闭调试日志
    disableLog() {
      NotificationUtils.disableDebugMode();
    },
    
    // 修复异常通知
    async fix() {
      return await NotificationUtils.fixBrokenNotifications();
    },
    
    // 测试目标达成逻辑
    async testGoal() {
      NotificationUtils.enableDebugMode();
      await NotificationUtils.updateTodayReminders();
    },
    
    // 手动取消今日剩余提醒
    async cancelToday() {
      NotificationUtils.enableDebugMode();
      await NotificationUtils.cancelTodayReminders();
    },
    
    // 帮助信息
    help() {
      console.log(`
🔧 通知调试工具使用说明:
  
基础功能:
  debugNotifications.list()         - 查看所有已安排的通知
  debugNotifications.test()         - 发送测试通知
  debugNotifications.reset()        - 重置通知系统
  debugNotifications.permission()   - 检查通知权限
  
测试功能:
  debugNotifications.delay(30)      - 30秒后发送测试通知
  debugNotifications.smart(14)      - 模拟下午2点的智能提醒
  debugNotifications.testGoal()     - 测试目标达成逻辑
  debugNotifications.cancelToday()  - 手动取消今日剩余提醒
  
维护功能:
  debugNotifications.fix()          - 检查并修复异常通知时间
  
日志控制:
  debugNotifications.enableLog()    - 开启详细日志
  debugNotifications.disableLog()   - 关闭详细日志
  
示例:
  await debugNotifications.list()      - 查看当前通知
  await debugNotifications.testGoal()  - 测试目标达成逻辑
  await debugNotifications.cancelToday() - 取消今日提醒
      `);
    },

    // 测试喝水后重置提醒
    async testDrinkingReset() {
      console.log('🧪 测试喝水后重置提醒功能...');
      NotificationUtils.enableDebugMode();
      await NotificationUtils.resetReminderAfterDrinking();
      showAlert('测试完成', '喝水后重置提醒测试已执行，请查看控制台详情', 'info');
    },
  };
  
  console.log('🚀 通知调试工具已加载！在控制台输入 debugNotifications.help() 查看使用说明');
} 