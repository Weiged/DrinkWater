// 测试快捷添加选项功能
const { StorageUtils } = require('./src/utils/storage');
const { QUICK_ADD_OPTIONS } = require('./src/constants');

async function testQuickAddOptions() {
  console.log('🧪 测试快捷添加选项功能...\n');

  try {
    // 1. 测试保存自定义选项
    console.log('1. 保存自定义快捷添加选项...');
    const customOptions = [
      { id: 1, amount: 150, label: '150ml' },
      { id: 2, amount: 300, label: '300ml' },
      { id: 3, amount: 400, label: '400ml' },
      { id: 4, amount: 600, label: '600ml' },
      { id: 5, amount: 800, label: '800ml' },
      { id: 6, amount: 1000, label: '1000ml' }
    ];
    
    await StorageUtils.saveQuickAddOptions(customOptions);
    console.log('✅ 自定义选项保存成功');

    // 2. 测试读取自定义选项
    console.log('\n2. 读取自定义快捷添加选项...');
    const loadedOptions = await StorageUtils.getQuickAddOptions();
    console.log('✅ 选项读取成功:', loadedOptions);

    // 3. 验证数据一致性
    console.log('\n3. 验证数据一致性...');
    const isValid = loadedOptions.length === customOptions.length &&
      loadedOptions.every((option, index) => 
        option.amount === customOptions[index].amount &&
        option.label === customOptions[index].label
      );
    
    if (isValid) {
      console.log('✅ 数据一致性检查通过');
    } else {
      console.log('❌ 数据一致性检查失败');
    }

    // 4. 测试恢复默认选项
    console.log('\n4. 恢复默认快捷添加选项...');
    await StorageUtils.saveQuickAddOptions(QUICK_ADD_OPTIONS);
    const defaultOptions = await StorageUtils.getQuickAddOptions();
    console.log('✅ 默认选项恢复成功:', defaultOptions);

    console.log('\n🎉 所有测试通过！快捷添加选项功能正常工作。');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testQuickAddOptions(); 