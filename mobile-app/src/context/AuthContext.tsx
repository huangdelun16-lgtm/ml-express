import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../services/api';

interface User {
  id: string;
  username: string;
  name: string;
  phone: string;
  role: 'customer' | 'city_rider' | 'city_accountant' | 'manager';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (userData: RegisterData) => Promise<boolean>;
}

interface RegisterData {
  username: string;
  password: string;
  name: string;
  phone: string;
  role: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const userToken = await SecureStore.getItemAsync('userToken');
      const userData = await SecureStore.getItemAsync('userData');
      
      if (userToken && userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('检查认证状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      // 调用网站的登录API
      const response = await apiClient.post('/auth/login', {
        username,
        password
      });

      if (response.data.success) {
        const userData = response.data.user;
        
        // 存储用户信息和token
        await SecureStore.setItemAsync('userToken', response.data.token);
        await SecureStore.setItemAsync('userData', JSON.stringify(userData));
        
        setUser(userData);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('登录失败:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      setLoading(true);
      
      const response = await apiClient.post('/auth/register', userData);
      
      if (response.data.success) {
        // 注册成功后自动登录
        return await login(userData.username, userData.password);
      }
      
      return false;
    } catch (error) {
      console.error('注册失败:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userData');
      setUser(null);
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
