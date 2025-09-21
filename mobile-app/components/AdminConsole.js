import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { adminService } from '../services/api';

export default function AdminConsole({ userData }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '', // 工作号
    name: '',
    phone: '',
    role: 'customer',
    password: '123456', // 默认密码
    idNumber: '', // 身份证号
    birthday: '', // 生日
    hireDate: new Date().toISOString().split('T')[0], // 入职日期，默认今天
    salary: '', // 薪资
    address: '', // 地址
    cvImage: null // CV图片
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getUsers();
      
      if (response.success) {
        // 处理不同的API响应格式
        let userList = [];
        if (response.data && response.data.users) {
          userList = response.data.users;
        } else if (Array.isArray(response.data)) {
          userList = response.data;
        } else {
          userList = [];
        }
        
        console.log('👥 用户列表:', userList);
        setUsers(userList);
      } else {
        Alert.alert('加载失败', response.message || '无法获取用户数据');
      }
    } catch (error) {
      console.error('加载用户失败:', error);
      Alert.alert('加载失败', '网络连接失败，请稍后重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleAddUser = async () => {
    // 基础字段验证
    if (!newUser.username.trim() || !newUser.name.trim() || !newUser.phone.trim()) {
      Alert.alert('表单验证', '请填写工作号、姓名和手机号');
      return;
    }

    // 骑手和财务需要额外字段
    if (newUser.role === 'city_rider' || newUser.role === 'city_accountant') {
      if (!newUser.idNumber.trim() || !newUser.birthday.trim() || !newUser.salary.trim()) {
        Alert.alert('表单验证', '骑手和财务人员需要填写身份证号、生日和薪资');
        return;
      }
    }

    if (!/^1[3-9]\d{9}$/.test(newUser.phone) && !/^09\d{8,9}$/.test(newUser.phone)) {
      Alert.alert('表单验证', '请输入正确的手机号码');
      return;
    }

    setIsSubmitting(true);

    try {
      const userData = {
        username: newUser.username.trim(),
        name: newUser.name.trim(),
        phone: newUser.phone.trim(),
        role: newUser.role,
        password: newUser.password,
        createdAt: new Date().toISOString()
      };

      // 如果是骑手或财务，添加额外字段
      if (newUser.role === 'city_rider' || newUser.role === 'city_accountant') {
        userData.idNumber = newUser.idNumber.trim();
        userData.birthday = newUser.birthday;
        userData.hireDate = newUser.hireDate;
        userData.salary = parseFloat(newUser.salary) || 0;
        userData.address = newUser.address.trim();
        userData.cvImage = newUser.cvImage;
      }

      const response = await adminService.createUser(userData);

      if (response.success) {
        Alert.alert(
          '创建成功',
          `用户 ${newUser.name} (${newUser.username}) 已创建成功！`,
          [
            {
              text: '确定',
              onPress: () => {
                setShowAddModal(false);
                setNewUser({
                  username: '',
                  name: '',
                  phone: '',
                  role: 'customer',
                  password: '123456',
                  idNumber: '',
                  birthday: '',
                  hireDate: new Date().toISOString().split('T')[0],
                  salary: '',
                  address: '',
                  cvImage: null
                });
                loadUsers();
              }
            }
          ]
        );
      } else {
        Alert.alert('创建失败', response.message || '用户名可能已存在');
      }
    } catch (error) {
      console.error('创建用户失败:', error);
      Alert.alert('创建失败', '网络连接失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = (user) => {
    Alert.alert(
      '确认删除',
      `确定要删除用户 ${user.name} (${user.username}) 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await adminService.deleteUser(user.username);
              if (response.success) {
                Alert.alert('删除成功', '用户已删除');
                loadUsers();
              } else {
                Alert.alert('删除失败', response.message || '请稍后重试');
              }
            } catch (error) {
              Alert.alert('删除失败', '网络错误，请稍后重试');
            }
          }
        }
      ]
    );
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'customer':
        return '客户';
      case 'city_rider':
        return '骑手';
      case 'city_accountant':
      case 'accountant':
        return '会计';
      case 'manager':
      case 'master':
        return '管理员';
      default:
        return role;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'customer':
        return '#2196f3';
      case 'city_rider':
        return '#4caf50';
      case 'city_accountant':
      case 'accountant':
        return '#ff9800';
      case 'manager':
      case 'master':
        return '#f44336';
      default:
        return '#666';
    }
  };

  const renderUserCard = (user, index) => (
    <View key={user.username || index} style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name || user.username}</Text>
          <Text style={styles.userUsername}>@{user.username}</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
          <Text style={styles.roleText}>{getRoleText(user.role)}</Text>
        </View>
      </View>

      <View style={styles.userDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>电话:</Text>
          <Text style={styles.detailValue}>{user.phone || '未设置'}</Text>
        </View>
        
        {user.id_number && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>身份证:</Text>
            <Text style={styles.detailValue}>{user.id_number}</Text>
          </View>
        )}
        
        {user.birthday && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>生日:</Text>
            <Text style={styles.detailValue}>{user.birthday}</Text>
          </View>
        )}
        
        {user.hire_date && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>入职日期:</Text>
            <Text style={styles.detailValue}>{user.hire_date}</Text>
          </View>
        )}
        
        {user.salary && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>薪资:</Text>
            <Text style={[styles.detailValue, styles.salaryText]}>
              {user.salary.toLocaleString()} 缅币
            </Text>
          </View>
        )}
        
        {user.address && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>地址:</Text>
            <Text style={styles.detailValue} numberOfLines={2}>{user.address}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => Alert.alert('编辑功能', '编辑功能开发中...')}
        >
          <Text style={styles.actionButtonText}>编辑</Text>
        </TouchableOpacity>
        
        {user.username !== userData?.username && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteUser(user)}
          >
            <Text style={styles.actionButtonText}>删除</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderAddUserModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowAddModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowAddModal(false)}>
            <Text style={styles.modalCloseButton}>✕ 取消</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>新增用户</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>工作号 *</Text>
            <TextInput
              style={styles.formInput}
              placeholder="输入工作号（如：MDY1209251）"
              value={newUser.username}
              onChangeText={(value) => setNewUser(prev => ({ ...prev, username: value }))}
              autoCapitalize="none"
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>姓名 *</Text>
            <TextInput
              style={styles.formInput}
              placeholder="输入真实姓名"
              value={newUser.name}
              onChangeText={(value) => setNewUser(prev => ({ ...prev, name: value }))}
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>手机号 *</Text>
            <TextInput
              style={styles.formInput}
              placeholder="输入手机号码"
              value={newUser.phone}
              onChangeText={(value) => setNewUser(prev => ({ ...prev, phone: value }))}
              keyboardType="phone-pad"
              editable={!isSubmitting}
            />
          </View>

          {(newUser.role === 'city_rider' || newUser.role === 'city_accountant') && (
            <>
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>身份证号 *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="输入身份证号码"
                  value={newUser.idNumber}
                  onChangeText={(value) => setNewUser(prev => ({ ...prev, idNumber: value }))}
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>生日 *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="YYYY-MM-DD"
                  value={newUser.birthday}
                  onChangeText={(value) => setNewUser(prev => ({ ...prev, birthday: value }))}
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>入职日期 *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="YYYY-MM-DD"
                  value={newUser.hireDate}
                  onChangeText={(value) => setNewUser(prev => ({ ...prev, hireDate: value }))}
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>薪资 *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="输入月薪（缅币）"
                  value={newUser.salary}
                  onChangeText={(value) => setNewUser(prev => ({ ...prev, salary: value }))}
                  keyboardType="numeric"
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>地址</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  placeholder="输入居住地址"
                  value={newUser.address}
                  onChangeText={(value) => setNewUser(prev => ({ ...prev, address: value }))}
                  multiline={true}
                  numberOfLines={2}
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>CV表单</Text>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => Alert.alert('上传CV', 'CV上传功能开发中...')}
                  disabled={isSubmitting}
                >
                  <Text style={styles.uploadButtonText}>
                    📄 {newUser.cvImage ? '已上传CV' : '上传CV表单'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.formHint}>支持图片格式：JPG, PNG</Text>
              </View>
            </>
          )}

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>用户角色 *</Text>
            <View style={styles.roleButtons}>
              {[
                { key: 'customer', label: '客户' },
                { key: 'city_rider', label: '骑手' },
                { key: 'city_accountant', label: '会计' },
                { key: 'manager', label: '管理员' }
              ].map(role => (
                <TouchableOpacity
                  key={role.key}
                  style={[
                    styles.roleButton,
                    newUser.role === role.key && styles.roleButtonActive
                  ]}
                  onPress={() => setNewUser(prev => ({ ...prev, role: role.key }))}
                  disabled={isSubmitting}
                >
                  <Text style={[
                    styles.roleButtonText,
                    newUser.role === role.key && styles.roleButtonTextActive
                  ]}>
                    {role.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>初始密码</Text>
            <TextInput
              style={styles.formInput}
              placeholder="设置初始密码"
              value={newUser.password}
              onChangeText={(value) => setNewUser(prev => ({ ...prev, password: value }))}
              secureTextEntry
              editable={!isSubmitting}
            />
            <Text style={styles.formHint}>默认密码：123456</Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleAddUser}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>创建用户</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>加载用户数据...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👥 控制台</Text>
        <Text style={styles.headerSubtitle}>用户账户管理</Text>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{users.length}</Text>
          <Text style={styles.statLabel}>总用户</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {Array.isArray(users) ? users.filter(u => u.role === 'city_rider').length : 0}
          </Text>
          <Text style={styles.statLabel}>骑手</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {Array.isArray(users) ? users.filter(u => u.role === 'customer').length : 0}
          </Text>
          <Text style={styles.statLabel}>客户</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ 新增</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.usersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {!Array.isArray(users) || users.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>👥</Text>
            <Text style={styles.emptyTitle}>暂无用户</Text>
            <Text style={styles.emptySubtitle}>点击新增按钮创建用户</Text>
          </View>
        ) : (
          users.map(renderUserCard)
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>

      {renderAddUserModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  usersList: {
    flex: 1,
  },
  userCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userUsername: {
    fontSize: 14,
    color: '#1976d2',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#2196f3',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
  },
  bottomSpace: {
    height: 20,
  },
  // Modal样式
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1976d2',
    paddingTop: 50,
  },
  modalCloseButton: {
    color: 'white',
    fontSize: 16,
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  formHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  roleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  roleButtonActive: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  roleButtonText: {
    fontSize: 14,
    color: '#666',
  },
  roleButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#1976d2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  uploadButton: {
    backgroundColor: '#2196f3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  salaryText: {
    color: '#4caf50',
    fontWeight: 'bold',
  },
});
