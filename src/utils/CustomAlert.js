import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../constants';

export default function CustomAlert({
  visible,
  title,
  message,
  type = 'info', // 'success', 'error', 'warning', 'info', 'confirm'
  onConfirm,
  onCancel,
  confirmText = '确定',
  cancelText = '取消',
  showCancel = false
}) {
  // 根据类型获取图标和颜色
  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: '✓',
          iconColor: COLORS.accent,
          backgroundColor: '#E8F5E8'
        };
      case 'error':
        return {
          icon: '✕',
          iconColor: COLORS.error,
          backgroundColor: '#FFE8E8'
        };
      case 'warning':
        return {
          icon: '⚠',
          iconColor: '#FF9500',
          backgroundColor: '#FFF4E6'
        };
      case 'confirm':
        return {
          icon: '?',
          iconColor: COLORS.primary,
          backgroundColor: '#E6F3FF'
        };
      default:
        return {
          icon: 'ℹ',
          iconColor: COLORS.secondary,
          backgroundColor: '#F0F8FF'
        };
    }
  };

  const config = getTypeConfig();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          {/* 图标区域 */}
          <View style={[styles.iconContainer, { backgroundColor: config.backgroundColor }]}>
            <Text style={[styles.icon, { color: config.iconColor }]}>
              {config.icon}
            </Text>
          </View>
          
          {/* 标题 */}
          <Text style={styles.title}>{title}</Text>
          
          {/* 消息 */}
          <Text style={styles.message}>{message}</Text>
          
          {/* 按钮区域 */}
          <View style={styles.buttonContainer}>
            {showCancel && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.button, styles.confirmButton, !showCancel && styles.fullWidthButton]}
              onPress={onConfirm}
            >
              <LinearGradient
                colors={type === 'error' ? [COLORS.error, '#D32F2F'] : [COLORS.primary, COLORS.secondary]}
                style={styles.confirmButtonGradient}
              >
                <Text style={styles.confirmButtonText}>{confirmText}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 25,
    width: '85%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  button: {
    flex: 1,
    borderRadius: SIZES.borderRadius,
    marginHorizontal: 5,
    overflow: 'hidden',
  },
  fullWidthButton: {
    marginHorizontal: 0,
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 16,
    fontWeight: '600',
  },
}); 