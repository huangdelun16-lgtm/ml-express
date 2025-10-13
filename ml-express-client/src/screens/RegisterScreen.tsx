import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { customerService } from '../services/supabase';
import { useApp } from '../contexts/AppContext';

export default function RegisterScreen({ navigation }: any) {
  const { language } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !phone || !password) {
      Alert.alert('', '请填写所有必填字段');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('', '两次密码输入不一致');
      return;
    }

    setLoading(true);
    try {
      const result = await customerService.register({
        name,
        email,
        phone,
        password,
        address,
      });

      if (result.success) {
        Alert.alert('', '注册成功！请登录', [
          { text: '确定', onPress: () => navigation.navigate('Login') }
        ]);
      } else {
        Alert.alert('', '注册失败，请重试');
      }
    } catch (error) {
      Alert.alert('', '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.title}>注册</Text>
      </View>

      <ScrollView style={styles.form}>
        <TextInput style={styles.input} placeholder="姓名 *" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="电子邮箱 *" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="电话号码 *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TextInput style={styles.input} placeholder="密码 *" value={password} onChangeText={setPassword} secureTextEntry />
        <TextInput style={styles.input} placeholder="确认密码 *" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
        <TextInput style={styles.input} placeholder="地址（可选）" value={address} onChangeText={setAddress} multiline />

        <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerButtonText}>注册</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc' },
  header: { backgroundColor: '#2c5282', padding: 20, paddingTop: 60 },
  backButton: { color: '#fff', fontSize: 16, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  form: { padding: 24 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16 },
  registerButton: { backgroundColor: '#3182ce', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  registerButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

