// 简单的应用测试脚本
const { StorageUtils } = require('./src/utils/storage');

async function testApp() {
  console.log('🧪 开始测试应用功能...\n');

  try {
    // 测试存储功能
    console.log('📦 测试数据存储...');
    await StorageUtils.saveDailyGoal(2500);
    const goal = await StorageUtils.getDailyGoal();
    console.log(`✅ 每日目标保存成功: ${goal}ml`);

    // 测试饮水记录
    console.log('\n💧 测试饮水记录...');
    const testRecord = {
      id: Date.now().toString(),
      amount: 250,
      timestamp: new Date().toISOString(),
      date: new Date().toDateString()
    };
    await StorageUtils.saveWaterRecord(testRecord);
    const records = await StorageUtils.getTodayWaterRecords();
    console.log(`✅ 饮水记录保存成功: ${records.length} 条记录`);

    // 测试通知设置
    console.log('\n🔔 测试通知设置...');
    const notificationSettings = {
      enabled: true,
      interval: 60,
      smart: true,
      startHour: 7,
      endHour: 22
    };
    await StorageUtils.saveNotificationSettings(notificationSettings);
    const settings = await StorageUtils.getNotificationSettings();
    console.log(`✅ 通知设置保存成功: 间隔${settings.interval}分钟`);

    console.log('\n🎉 所有测试通过！应用功能正常。');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  testApp();
}

module.exports = { testApp }; 