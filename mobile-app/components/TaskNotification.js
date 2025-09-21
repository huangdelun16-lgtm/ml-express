import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { apiService } from '../services/api';

export default function TaskNotification({ userData, onTaskUpdate }) {
  const [pendingTasks, setPendingTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (userData && userData.role === 'city_rider') {
      checkForNewTasks();
      // 每30秒检查一次新任务
      const interval = setInterval(checkForNewTasks, 30000);
      return () => clearInterval(interval);
    }
  }, [userData]);

  const checkForNewTasks = async () => {
    if (!userData || userData.role !== 'city_rider') return;

    try {
      const response = await fetch(`https://market-link-express.com/.netlify/functions/riders-manage?action=assignments&riderId=${userData.username}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-ml-actor': 'mobile-app',
          'x-ml-role': 'mobile-client'
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success && data.data) {
        const newPendingTasks = data.data.filter(task => task.status === 'pending');
        
        // 如果有新的待处理任务，显示通知
        if (newPendingTasks.length > 0) {
          const latestTask = newPendingTasks[0];
          
          // 检查是否是新任务（避免重复通知）
          if (!pendingTasks.find(task => task.taskId === latestTask.taskId)) {
            console.log('🔔 收到新任务通知:', latestTask);
            setPendingTasks(newPendingTasks);
            setCurrentTask(latestTask);
            setShowModal(true);
            
            // 震动提醒
            Vibration.vibrate([0, 500, 200, 500]);
          }
        } else {
          setPendingTasks([]);
        }
      }
    } catch (error) {
      console.error('检查新任务失败:', error);
    }
  };

  const handleAcceptTask = async () => {
    if (!currentTask) return;

    setProcessing(true);
    try {
      // 1. 更新任务状态为已接受
      const response = await apiService.put('/riders-manage', {
        action: 'update_assignment',
        taskId: currentTask.taskId,
        status: 'accepted',
        riderId: userData.username
      });

      if (response.success) {
        console.log('✅ 任务已接受:', currentTask.trackingNumber);
        
        // 2. 骑手状态已在服务端自动更新为忙碌
        console.log('🔄 接单后骑手状态已自动更新为忙碌');

        // 3. 通知主界面更新
        if (onTaskUpdate) {
          onTaskUpdate({
            type: 'accept',
            task: currentTask,
            newStatus: 'busy'
          });
        }

        // 3. 移除已处理的任务
        setPendingTasks(prev => prev.filter(task => task.taskId !== currentTask.taskId));
        setShowModal(false);
        setCurrentTask(null);

        Alert.alert(
          '接单成功！',
          `您已接受 ${currentTask.trackingNumber} 的${currentTask.taskType === 'pickup' ? '取件' : '配送'}任务。\n\n目的地: ${currentTask.destination}\n预计用时: ${currentTask.estimatedTime}分钟`,
          [{ text: '确定' }]
        );
      } else {
        throw new Error(response.message || '接单失败');
      }
    } catch (error) {
      console.error('接单失败:', error);
      Alert.alert('接单失败', error.message || '请稍后重试');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectTask = async () => {
    if (!currentTask) return;

    Alert.alert(
      '确认拒绝',
      '您确定要拒绝这个任务吗？拒绝后系统将重新分配给其他骑手。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认拒绝',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              const response = await apiService.put('/riders-manage', {
                action: 'update_assignment',
                taskId: currentTask.taskId,
                status: 'rejected',
                riderId: userData.username
              });

              if (response.success) {
                console.log('❌ 任务已拒绝:', currentTask.trackingNumber);
                
                // 骑手状态已在服务端自动更新为在线
                console.log('🔄 拒单后骑手状态已自动更新为在线');

                if (onTaskUpdate) {
                  onTaskUpdate({
                    type: 'reject',
                    task: currentTask,
                    newStatus: 'online'
                  });
                }

                setPendingTasks(prev => prev.filter(task => task.taskId !== currentTask.taskId));
                setShowModal(false);
                setCurrentTask(null);

                Alert.alert('已拒绝', '任务已拒绝，系统将重新分配');
              } else {
                throw new Error(response.message || '拒绝失败');
              }
            } catch (error) {
              console.error('拒绝任务失败:', error);
              Alert.alert('操作失败', error.message || '请稍后重试');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  const getTaskTypeText = (type) => {
    return type === 'pickup' ? '取件任务' : '配送任务';
  };

  const getTaskTypeIcon = (type) => {
    return type === 'pickup' ? '📦' : '🚚';
  };

  if (!showModal || !currentTask) {
    return null;
  }

  return (
    <Modal
      visible={showModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => !processing && setShowModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerIcon}>🔔</Text>
            <Text style={styles.headerTitle}>新任务通知</Text>
          </View>

          <View style={styles.taskInfo}>
            <View style={styles.taskTypeContainer}>
              <Text style={styles.taskTypeIcon}>
                {getTaskTypeIcon(currentTask.taskType)}
              </Text>
              <Text style={styles.taskTypeText}>
                {getTaskTypeText(currentTask.taskType)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>单号:</Text>
              <Text style={styles.infoValue}>{currentTask.trackingNumber}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>目的地:</Text>
              <Text style={styles.infoValue} numberOfLines={2}>
                {currentTask.destination}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>预计用时:</Text>
              <Text style={styles.infoValue}>{currentTask.estimatedTime}分钟</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>分配时间:</Text>
              <Text style={styles.infoValue}>
                {new Date(currentTask.assignedAt).toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.rejectButton]}
              onPress={handleRejectTask}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.buttonText}>拒绝</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={handleAcceptTask}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.buttonText}>接单</Text>
              )}
            </TouchableOpacity>
          </View>

          {pendingTasks.length > 1 && (
            <Text style={styles.pendingCount}>
              还有 {pendingTasks.length - 1} 个待处理任务
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  taskInfo: {
    marginBottom: 24,
  },
  taskTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  taskTypeIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  taskTypeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  acceptButton: {
    backgroundColor: '#4caf50',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pendingCount: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});
