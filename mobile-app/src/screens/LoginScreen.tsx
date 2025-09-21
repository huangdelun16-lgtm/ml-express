import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  RadioButton,
  Divider,
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/theme';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('customer');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('错误', '请填写用户名和密码');
      return;
    }

    setLoading(true);
    const success = await login(username.trim(), password);
    setLoading(false);

    if (!success) {
      Alert.alert('登录失败', '用户名或密码错误');
    }
  };

  const handleRegister = async () => {
    if (!username.trim() || !password.trim() || !name.trim() || !phone.trim()) {
      Alert.alert('错误', '请填写所有必填字段');
      return;
    }

    if (password.length < 6) {
      Alert.alert('错误', '密码长度至少6位');
      return;
    }

    setLoading(true);
    const success = await register({
      username: username.trim(),
      password,
      name: name.trim(),
      phone: phone.trim(),
      role,
    });
    setLoading(false);

    if (!success) {
      Alert.alert('注册失败', '用户名已存在或其他错误');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>ML Express</Title>
            <Paragraph style={styles.subtitle}>
              {isRegister ? '创建新账户' : '登录您的账户'}
            </Paragraph>

            <TextInput
              label="用户名"
              value={username}
              onChangeText={setUsername}
              style={styles.input}
              mode="outlined"
              autoCapitalize="none"
            />

            <TextInput
              label="密码"
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              mode="outlined"
              secureTextEntry
            />

            {isRegister && (
              <>
                <TextInput
                  label="姓名"
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  mode="outlined"
                />

                <TextInput
                  label="手机号"
                  value={phone}
                  onChangeText={setPhone}
                  style={styles.input}
                  mode="outlined"
                  keyboardType="phone-pad"
                />

                <Text style={styles.roleTitle}>账户类型</Text>
                <RadioButton.Group
                  onValueChange={(value) => setRole(value)}
                  value={role}
                >
                  <View style={styles.radioItem}>
                    <RadioButton value="customer" />
                    <Text style={styles.radioLabel}>客户</Text>
                  </View>
                  <View style={styles.radioItem}>
                    <RadioButton value="city_rider" />
                    <Text style={styles.radioLabel}>骑手</Text>
                  </View>
                </RadioButton.Group>
              </>
            )}

            <Button
              mode="contained"
              onPress={isRegister ? handleRegister : handleLogin}
              style={styles.button}
              loading={loading}
              disabled={loading}
            >
              {isRegister ? '注册' : '登录'}
            </Button>

            <Divider style={styles.divider} />

            <Button
              mode="text"
              onPress={() => setIsRegister(!isRegister)}
              style={styles.switchButton}
            >
              {isRegister ? '已有账户？点击登录' : '没有账户？点击注册'}
            </Button>
          </Card.Content>
        </Card>

        <Text style={styles.footer}>
          © 2024 ML Express. 同城运输专家
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 12,
    elevation: 8,
  },
  title: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 16,
    color: colors.gray,
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 8,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  radioLabel: {
    fontSize: 16,
    marginLeft: 8,
  },
  button: {
    marginTop: 16,
    paddingVertical: 8,
  },
  divider: {
    marginVertical: 16,
  },
  switchButton: {
    marginTop: 8,
  },
  footer: {
    textAlign: 'center',
    color: colors.white,
    fontSize: 14,
    marginTop: 20,
    opacity: 0.8,
  },
});
