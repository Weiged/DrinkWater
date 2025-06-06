import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const BACKGROUND_NOTIFICATION_TASK = 'background-notification';

// 注册后台任务
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({ data, error, executionInfo }) => {
  console.log('后台通知任务执行:', { data, error, executionInfo });
  
  if (error) {
    console.error('后台任务错误:', error);
    return;
  }

  // 在后台执行通知相关的检查
  console.log('执行后台通知检查...');
  
  // 这里可以添加额外的后台逻辑，比如检查是否需要发送通知
  return Promise.resolve();
});

export const BackgroundTaskUtils = {
  // 注册后台通知任务
  async registerBackgroundTask() {
    try {
      if (Platform.OS === 'ios') {
        // iOS 需要注册后台应用刷新任务
        const { status } = await TaskManager.getRegisteredTasksAsync();
        console.log('已注册的后台任务:', status);
        
        if (!TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK)) {
          await TaskManager.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
          console.log('✅ iOS后台任务注册成功');
        }
      }
      
      return true;
    } catch (error) {
      console.error('注册后台任务失败:', error);
      return false;
    }
  },

  // 取消后台任务
  async unregisterBackgroundTask() {
    try {
      if (TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK)) {
        await TaskManager.unregisterTaskAsync(BACKGROUND_NOTIFICATION_TASK);
        console.log('✅ 后台任务已取消注册');
      }
      return true;
    } catch (error) {
      console.error('取消后台任务失败:', error);
      return false;
    }
  },

  // 检查后台任务状态
  async getBackgroundTaskStatus() {
    try {
      const registeredTasks = await TaskManager.getRegisteredTasksAsync();
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
      
      console.log('后台任务状态:', {
        isRegistered,
        registeredTasks: registeredTasks.map(task => task.taskName)
      });
      
      return {
        isRegistered,
        registeredTasks
      };
    } catch (error) {
      console.error('获取后台任务状态失败:', error);
      return { isRegistered: false, registeredTasks: [] };
    }
  },

  // 设置应用状态监听器
  setupAppStateListener() {
    // 这个方法将在App.js中调用
    console.log('🔧 设置应用状态监听器...');
    
    // 监听应用状态变化
    if (Platform.OS === 'android') {
      // Android特定的后台处理
      console.log('📱 Android平台：设置后台处理');
    } else if (Platform.OS === 'ios') {
      // iOS特定的后台处理
      console.log('🍎 iOS平台：设置后台处理');
    }
  },

  // 优化通知以在后台正常工作
  async optimizeNotificationsForBackground() {
    try {
      console.log('🔧 优化通知以支持后台运行...');
      
      if (Platform.OS === 'android') {
        // Android：确保通知渠道设置正确
        await Notifications.setNotificationChannelAsync('water-reminder-critical', {
          name: '喝水提醒（关键）',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4FC3F7',
          enableVibrate: true,
          enableLights: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true, // 允许绕过勿扰模式
          showBadge: true,
        });
        
        console.log('✅ Android后台通知渠道优化完成');
      }
      
      if (Platform.OS === 'ios') {
        // iOS：确保通知权限配置正确
        const { status } = await Notifications.getPermissionsAsync();
        console.log('📱 iOS通知权限状态:', status);
        
        if (status === 'granted') {
          console.log('✅ iOS通知权限正常');
        } else {
          console.log('⚠️ iOS通知权限异常，需要重新申请');
        }
      }
      
      return true;
    } catch (error) {
      console.error('优化后台通知失败:', error);
      return false;
    }
  },

  // 用户指导：如何确保后台通知正常工作
  getBackgroundNotificationGuidance() {
    const guidance = {
      ios: [
        '1. 在"设置" > "通知" > "喝水提醒"中确保已启用通知',
        '2. 确保"允许通知"开关已打开',
        '3. 在"设置" > "常规" > "后台应用刷新"中启用"喝水提醒"',
        '4. 不要在控制中心完全关闭应用，使用主屏幕按钮返回',
        '5. 确保设备电量充足或连接电源'
      ],
      android: [
        '1. 在"设置" > "应用" > "喝水提醒" > "通知"中确保已启用通知',
        '2. 在"设置" > "应用" > "喝水提醒" > "电池"中设置为"不优化"',
        '3. 在"设置" > "应用" > "喝水提醒"中允许"后台活动"',
        '4. 确保"自启动管理"中允许"喝水提醒"自启动',
        '5. 在通知设置中将提醒设置为"重要"或"紧急"级别'
      ]
    };
    
    return guidance[Platform.OS] || guidance.android;
  }
};

// 导出后台任务名称
export { BACKGROUND_NOTIFICATION_TASK }; 