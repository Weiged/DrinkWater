import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, ClipPath, Rect, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { COLORS, SIZES } from '../constants';

const { width } = Dimensions.get('window');

// 创建动画Rect组件
const AnimatedRect = Animated.createAnimatedComponent(Rect);

export default function WaterBallProgress({ 
  currentAmount = 0, 
  goalAmount = 2000, 
  size = 200 
}) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  const percentage = Math.min(currentAmount / goalAmount, 1);
  const percentageText = Math.round(percentage * 100);

  useEffect(() => {
    // 水位上升动画
    Animated.timing(animatedValue, {
      toValue: percentage,
      duration: 2000,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  // 根据进度获取水的颜色
  const getWaterColor = () => {
    if (percentage >= 1) return '#00D4FF'; // 完成 - 蓝色
    if (percentage >= 0.75) return '#26E5FF'; // 75% - 浅蓝
    if (percentage >= 0.5) return '#4ECBF1'; // 50% - 中蓝
    return '#B3E5FC'; // 低于50% - 淡蓝
  };

  // 获取鼓励文字
  const getEncouragementText = () => {
    if (percentage >= 1) return '🎉 目标达成！';
    if (percentage >= 0.75) return '💪 快完成了！';
    if (percentage >= 0.5) return '👍 进展良好！';
    if (percentage >= 0.25) return '🚀 继续加油！';
    return '💧 开始喝水吧！';
  };

  const ballSize = size;
  const radius = ballSize / 2;
  const centerX = radius;
  const centerY = radius;
  
  const waterY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [ballSize, 0], // SVG坐标系中，0在顶部
  });

  return (
    <View style={styles.container}>
      {/* SVG水球容器 */}
      <View style={[styles.ballContainer, { width: ballSize, height: ballSize }]}>
        <View style={[styles.svgContainer, { width: ballSize, height: ballSize }]}>
          <Svg width={ballSize} height={ballSize}>
            <Defs>
              {/* 圆形裁剪路径 */}
              <ClipPath id="circleClip">
                <Circle cx={centerX} cy={centerY} r={radius - 3} />
              </ClipPath>
              
              {/* 水的渐变 */}
              <SvgLinearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={getWaterColor()} stopOpacity="1" />
                <Stop offset="100%" stopColor={getWaterColor()} stopOpacity="0.8" />
              </SvgLinearGradient>
            </Defs>
            
            {/* 背景圆形 */}
            <Circle
              cx={centerX}
              cy={centerY}
              r={radius - 3}
              fill="rgba(255, 255, 255, 0.1)"
            />
            
            {/* 水位 */}
            <AnimatedRect
              x="0"
              y={waterY}
              width={ballSize}
              height={ballSize}
              fill="url(#waterGradient)"
              clipPath="url(#circleClip)"
            />
            
            {/* 玻璃球边框 - 放在最上层 */}
            <Circle
              cx={centerX}
              cy={centerY}
              r={radius - 3}
              fill="transparent"
              stroke="rgba(100, 150, 200, 0.8)"
              strokeWidth="4"
            />
            
            {/* 内层边框增强立体感 */}
            <Circle
              cx={centerX}
              cy={centerY}
              r={radius - 2}
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.5)"
              strokeWidth="1"
            />
          </Svg>
        </View>

        {/* 玻璃光泽效果 */}
        <View style={[
          styles.glassShine, 
          { 
            width: ballSize * 0.3, 
            height: ballSize * 0.6,
            borderRadius: 50,
            top: ballSize * 0.15,
            left: ballSize * 0.2,
          }
        ]} />
        
        {/* 进度文字（在球内） */}
        <View style={[styles.progressTextContainer, { width: ballSize, height: ballSize }]}>
          <Text style={styles.percentageText}>{`${percentageText} %`}</Text>
          <Text style={styles.amountText}>{currentAmount}ml</Text>
        </View>
      </View>

      {/* 底部信息 */}
      <View style={styles.infoContainer}>
        <Text style={styles.goalText}>目标: {goalAmount}ml</Text>
        <Text style={styles.remainingText}>
          剩余: {Math.max(0, goalAmount - currentAmount)}ml
        </Text>
        <Text style={styles.encouragementText}>
          {getEncouragementText()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: SIZES.padding,
  },
  ballContainer: {
    position: 'relative',
    marginBottom: SIZES.margin,
    aspectRatio: 1,
  },
  svgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  glassShine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    transform: [{ rotate: '45deg' }],
  },
  progressTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  percentageText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  amountText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  infoContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    minWidth: 200,
  },
  goalText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  remainingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  encouragementText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 