import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 配置通知处理
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const notificationType = notification.request.content.data?.type;
    console.log('收到通知，类型:', notificationType);
    
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
  async scheduleWaterReminder(intervalMinutes = 60) {
    try {
      // 先取消所有现有的提醒
      await this.cancelAllReminders();
      
      // 设置新的提醒（从现在开始，每隔指定时间提醒一次）
      const trigger = {
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
      
      console.log(`已设置每${intervalMinutes}分钟的喝水提醒`);
    } catch (error) {
      console.error('设置提醒失败:', error);
    }
  },

  // 设置智能提醒（避开睡眠时间）
  async scheduleSmartReminder(intervalMinutes = 60, startHour = 7, endHour = 22) {
    try {
      await this.cancelAllReminders();
      
      // 计算一天中需要提醒的次数
      const activeHours = endHour - startHour;
      const remindersPerDay = Math.floor((activeHours * 60) / intervalMinutes);
      
      for (let i = 0; i < remindersPerDay; i++) {
        const reminderTime = new Date();
        reminderTime.setHours(startHour);
        reminderTime.setMinutes(i * intervalMinutes);
        reminderTime.setSeconds(0);
        
        // 如果时间已过，设置为明天
        if (reminderTime <= new Date()) {
          reminderTime.setDate(reminderTime.getDate() + 1);
        }
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '💧 喝水时间到！',
            body: '别忘了补充水分哦～',
            sound: 'default',
            data: { type: 'smart_reminder', index: i },
          },
          trigger: {
            hour: reminderTime.getHours(),
            minute: reminderTime.getMinutes(),
            repeats: true,
          },
        });
      }
      
      console.log(`已设置智能提醒：${startHour}:00-${endHour}:00，每${intervalMinutes}分钟一次`);
    } catch (error) {
      console.error('设置智能提醒失败:', error);
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
  }
}; 