import { useState, useEffect, useCallback } from 'react';
import { securityService, SensitiveDataType, DataMaskingUtils, SecurityValidationUtils } from '../services/SecurityService';

// 安全钩子
export const useSecurity = () => {
  const [isSecure, setIsSecure] = useState(true);
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);

  // 初始化安全检查
  useEffect(() => {
    const checkSecurity = async () => {
      try {
        const result = await securityService.checkDeviceSecurity();
        setIsSecure(result.isSecure);
        setSecurityWarnings(result.warnings);
      } catch (error) {
        console.error('Security check failed:', error);
        setIsSecure(false);
        setSecurityWarnings(['安全检查失败']);
      }
    };

    checkSecurity();
  }, []);

  // 安全存储数据
  const secureStore = useCallback(async (key: string, data: string, type: SensitiveDataType) => {
    try {
      await securityService.secureStore(key, data, type);
      return true;
    } catch (error) {
      console.error('Secure store failed:', error);
      return false;
    }
  }, []);

  // 安全获取数据
  const secureGet = useCallback(async (key: string, type: SensitiveDataType) => {
    try {
      return await securityService.secureGet(key, type);
    } catch (error) {
      console.error('Secure get failed:', error);
      return null;
    }
  }, []);

  // 安全删除数据
  const secureRemove = useCallback(async (key: string) => {
    try {
      await securityService.secureRemove(key);
      return true;
    } catch (error) {
      console.error('Secure remove failed:', error);
      return false;
    }
  }, []);

  // 生成安全令牌
  const generateToken = useCallback((userId: string) => {
    return securityService.generateSecureToken(userId);
  }, []);

  // 验证安全令牌
  const validateToken = useCallback((token: string) => {
    return securityService.validateSecureToken(token);
  }, []);

  // 安全清理
  const secureWipe = useCallback(async () => {
    try {
      await securityService.secureWipe();
      return true;
    } catch (error) {
      console.error('Secure wipe failed:', error);
      return false;
    }
  }, []);

  return {
    isSecure,
    securityWarnings,
    secureStore,
    secureGet,
    secureRemove,
    generateToken,
    validateToken,
    secureWipe,
  };
};

// 密码安全钩子
export const usePasswordSecurity = () => {
  const [passwordStrength, setPasswordStrength] = useState({
    isValid: false,
    score: 0,
    suggestions: [] as string[],
  });

  // 验证密码强度
  const validatePassword = useCallback((password: string) => {
    const result = securityService.validatePasswordStrength(password);
    setPasswordStrength(result);
    return result;
  }, []);

  // 检查密码是否有效
  const isPasswordValid = useCallback((password: string) => {
    return SecurityValidationUtils.validatePassword(password);
  }, []);

  return {
    passwordStrength,
    validatePassword,
    isPasswordValid,
  };
};

// 登录安全钩子
export const useLoginSecurity = () => {
  const [loginAttempts, setLoginAttempts] = useState({
    allowed: true,
    remainingAttempts: 5,
    lockoutTime: undefined as number | undefined,
  });

  // 检查登录尝试
  const checkLoginAttempts = useCallback((identifier: string) => {
    const result = securityService.checkLoginAttempts(identifier);
    setLoginAttempts(result);
    return result;
  }, []);

  // 记录登录尝试
  const recordLoginAttempt = useCallback((identifier: string, success: boolean) => {
    securityService.recordLoginAttempt(identifier, success);
    // 重新检查尝试次数
    checkLoginAttempts(identifier);
  }, [checkLoginAttempts]);

  return {
    loginAttempts,
    checkLoginAttempts,
    recordLoginAttempt,
  };
};

// 数据脱敏钩子
export const useDataMasking = () => {
  // 脱敏手机号
  const maskPhone = useCallback((phone: string) => {
    return DataMaskingUtils.maskPhone(phone);
  }, []);

  // 脱敏邮箱
  const maskEmail = useCallback((email: string) => {
    return DataMaskingUtils.maskEmail(email);
  }, []);

  // 脱敏地址
  const maskAddress = useCallback((address: string) => {
    return DataMaskingUtils.maskAddress(address);
  }, []);

  // 脱敏身份证号
  const maskIdCard = useCallback((idCard: string) => {
    return DataMaskingUtils.maskIdCard(idCard);
  }, []);

  // 脱敏银行卡号
  const maskBankCard = useCallback((cardNumber: string) => {
    return DataMaskingUtils.maskBankCard(cardNumber);
  }, []);

  return {
    maskPhone,
    maskEmail,
    maskAddress,
    maskIdCard,
    maskBankCard,
  };
};

// 输入验证钩子
export const useInputValidation = () => {
  // 验证手机号
  const validatePhone = useCallback((phone: string) => {
    return SecurityValidationUtils.validatePhone(phone);
  }, []);

  // 验证邮箱
  const validateEmail = useCallback((email: string) => {
    return SecurityValidationUtils.validateEmail(email);
  }, []);

  // 验证输入安全性
  const validateInput = useCallback((input: string) => {
    return SecurityValidationUtils.validateInput(input);
  }, []);

  // 验证密码
  const validatePassword = useCallback((password: string) => {
    return SecurityValidationUtils.validatePassword(password);
  }, []);

  return {
    validatePhone,
    validateEmail,
    validateInput,
    validatePassword,
  };
};

// 安全存储钩子
export const useSecureStorage = () => {
  // 存储用户令牌
  const storeToken = useCallback(async (key: string, token: string) => {
    return await securityService.secureStore(key, token, SensitiveDataType.TOKEN);
  }, []);

  // 获取用户令牌
  const getToken = useCallback(async (key: string) => {
    return await securityService.secureGet(key, SensitiveDataType.TOKEN);
  }, []);

  // 存储密码
  const storePassword = useCallback(async (key: string, password: string) => {
    return await securityService.secureStore(key, password, SensitiveDataType.PASSWORD);
  }, []);

  // 获取密码
  const getPassword = useCallback(async (key: string) => {
    return await securityService.secureGet(key, SensitiveDataType.PASSWORD);
  }, []);

  // 存储手机号
  const storePhone = useCallback(async (key: string, phone: string) => {
    return await securityService.secureStore(key, phone, SensitiveDataType.PHONE);
  }, []);

  // 获取手机号
  const getPhone = useCallback(async (key: string) => {
    return await securityService.secureGet(key, SensitiveDataType.PHONE);
  }, []);

  // 存储邮箱
  const storeEmail = useCallback(async (key: string, email: string) => {
    return await securityService.secureStore(key, email, SensitiveDataType.EMAIL);
  }, []);

  // 获取邮箱
  const getEmail = useCallback(async (key: string) => {
    return await securityService.secureGet(key, SensitiveDataType.EMAIL);
  }, []);

  // 存储地址
  const storeAddress = useCallback(async (key: string, address: string) => {
    return await securityService.secureStore(key, address, SensitiveDataType.ADDRESS);
  }, []);

  // 获取地址
  const getAddress = useCallback(async (key: string) => {
    return await securityService.secureGet(key, SensitiveDataType.ADDRESS);
  }, []);

  // 删除安全数据
  const removeSecureData = useCallback(async (key: string) => {
    return await securityService.secureRemove(key);
  }, []);

  return {
    storeToken,
    getToken,
    storePassword,
    getPassword,
    storePhone,
    getPhone,
    storeEmail,
    getEmail,
    storeAddress,
    getAddress,
    removeSecureData,
  };
};

// 安全状态钩子
export const useSecurityStatus = () => {
  const [securityStats, setSecurityStats] = useState(securityService.getSecurityStats());

  // 更新安全统计
  const updateStats = useCallback(() => {
    setSecurityStats(securityService.getSecurityStats());
  }, []);

  // 定期更新统计
  useEffect(() => {
    const interval = setInterval(updateStats, 30000); // 30秒更新一次
    return () => clearInterval(interval);
  }, [updateStats]);

  return {
    securityStats,
    updateStats,
  };
};
