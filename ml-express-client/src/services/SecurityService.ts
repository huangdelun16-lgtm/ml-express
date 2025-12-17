import AsyncStorage from '@react-native-async-storage/async-storage';
import LoggerService from './LoggerService';
import CryptoJS from 'crypto-js';

// 安全配置
interface SecurityConfig {
  encryptionKey: string;
  tokenExpiry: number; // 令牌过期时间（毫秒）
  maxLoginAttempts: number; // 最大登录尝试次数
  lockoutDuration: number; // 锁定持续时间（毫秒）
}
// 默认安全配置
const DEFAULT_CONFIG: SecurityConfig = {
  encryptionKey: 'ML_EXPRESS_SECURE_KEY_2024', // 在生产环境中应该从安全的地方获取
  tokenExpiry: 24 * 60 * 60 * 1000, // 24小时
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15分钟
};
// 敏感数据类型
enum SensitiveDataType {
  PASSWORD = 'password',
  TOKEN = 'token',
  PHONE = 'phone',
  EMAIL = 'email',
  ADDRESS = 'address',
  PAYMENT_INFO = 'payment_info',
// 安全服务类
export class SecurityService {
  private static instance: SecurityService;
  private config: SecurityConfig;
  private loginAttempts = new Map<string, { count: number; lastAttempt: number; lockedUntil?: number }>();
  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
  // 初始化安全服务
  async initialize(): Promise<void> {
    try {
      // 检查设备安全状态
      await this.checkDeviceSecurity();
      
      // 清理过期的安全数据
      await this.cleanupExpiredData();
      LoggerService.debug('Security service initialized');
    } catch (error) {
      LoggerService.error('Failed to initialize security service:', error);
  // 加密数据
  encryptData(data: string, type: SensitiveDataType): string {
      const key = this.generateKey(type);
      const encrypted = CryptoJS.AES.encrypt(data, key).toString();
      return encrypted;
      LoggerService.error('Encryption failed:', error);
      throw new Error('数据加密失败');
  // 解密数据
  decryptData(encryptedData: string, type: SensitiveDataType): string {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
      return decrypted.toString(CryptoJS.enc.Utf8);
      LoggerService.error('Decryption failed:', error);
      throw new Error('数据解密失败');
  // 安全存储敏感数据
  async secureStore(key: string, data: string, type: SensitiveDataType): Promise<void> {
      const encryptedData = this.encryptData(data, type);
      const secureKey = this.generateSecureKey(key);
      await AsyncStorage.setItem(secureKey, JSON.stringify({
        data: encryptedData,
        type,
        timestamp: Date.now(),
        expiry: Date.now() + this.config.tokenExpiry,
      }));
      LoggerService.error('Secure storage failed:', error);
      throw new Error('安全存储失败');
  // 安全获取敏感数据
  async secureGet(key: string, type: SensitiveDataType): Promise<string | null> {
      const stored = await AsyncStorage.getItem(secureKey);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      // 检查是否过期
      if (Date.now() > parsed.expiry) {
        await AsyncStorage.removeItem(secureKey);
        return null;
      }
      return this.decryptData(parsed.data, type);
      LoggerService.error('Secure retrieval failed:', error);
      return null;
  // 安全删除敏感数据
  async secureRemove(key: string): Promise<void> {
      await AsyncStorage.removeItem(secureKey);
      LoggerService.error('Secure removal failed:', error);
  // 生成安全令牌
  generateSecureToken(userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const data = `${userId}_${timestamp}_${random}`;
    return this.encryptData(data, SensitiveDataType.TOKEN);
  // 验证安全令牌
  validateSecureToken(token: string): { valid: boolean; userId?: string; expired?: boolean } {
      const decrypted = this.decryptData(token, SensitiveDataType.TOKEN);
      const [userId, timestamp] = decrypted.split('_');
      // 检查令牌是否过期
      if (Date.now() - parseInt(timestamp) > this.config.tokenExpiry) {
        return { valid: false, expired: true };
      return { valid: true, userId };
      return { valid: false };
  // 密码强度验证
  validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    let score = 0;
    // 长度检查
    if (password.length >= 8) {
      score += 1;
    } else {
      suggestions.push('密码长度至少8位');
    // 包含小写字母
    if (/[a-z]/.test(password)) {
      suggestions.push('包含小写字母');
    // 包含大写字母
    if (/[A-Z]/.test(password)) {
      suggestions.push('包含大写字母');
    // 包含数字
    if (/\d/.test(password)) {
      suggestions.push('包含数字');
    // 包含特殊字符
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      suggestions.push('包含特殊字符');
    return {
      isValid: score >= 3,
      score,
      suggestions,
    };
  // 检查登录尝试
  checkLoginAttempts(identifier: string): { allowed: boolean; remainingAttempts: number; lockoutTime?: number } {
    const attempts = this.loginAttempts.get(identifier);
    
    if (!attempts) {
      return { allowed: true, remainingAttempts: this.config.maxLoginAttempts };
    // 检查是否在锁定期间
    if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutTime: attempts.lockedUntil,
      };
    // 检查是否超过最大尝试次数
    if (attempts.count >= this.config.maxLoginAttempts) {
      // 设置锁定
      const lockedUntil = Date.now() + this.config.lockoutDuration;
      this.loginAttempts.set(identifier, {
        ...attempts,
        lockedUntil,
      });
        lockoutTime: lockedUntil,
      allowed: true,
      remainingAttempts: this.config.maxLoginAttempts - attempts.count,
  // 记录登录尝试
  recordLoginAttempt(identifier: string, success: boolean): void {
    const attempts = this.loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
    if (success) {
      // 登录成功，清除尝试记录
      this.loginAttempts.delete(identifier);
      // 登录失败，增加尝试次数
        count: attempts.count + 1,
        lastAttempt: Date.now(),
  // 清理过期的安全数据
  async cleanupExpiredData(): Promise<void> {
      const keys = await AsyncStorage.getAllKeys();
      const securityKeys = keys.filter(key => key.startsWith('secure_'));
      for (const key of securityKeys) {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Date.now() > parsed.expiry) {
            await AsyncStorage.removeItem(key);
          }
        }
      LoggerService.error('Cleanup failed:', error);
  // 检查设备安全状态
  async checkDeviceSecurity(): Promise<{ isSecure: boolean; warnings: string[] }> {
    const warnings: string[] = [];
      // 检查是否在模拟器中运行
      if (__DEV__) {
        warnings.push('应用在开发环境中运行');
      // 检查设备是否越狱/root
      // 这里应该使用实际的越狱检测库
      const isJailbroken = false; // 模拟检测结果
      if (isJailbroken) {
        warnings.push('设备可能已越狱，存在安全风险');
        isSecure: warnings.length === 0,
        warnings,
      LoggerService.error('Device security check failed:', error);
        isSecure: false,
        warnings: ['无法检查设备安全状态'],
  // 生成数据哈希
  generateHash(data: string): string {
    return CryptoJS.SHA256(data).toString();
  // 验证数据完整性
  verifyDataIntegrity(data: string, hash: string): boolean {
    const computedHash = this.generateHash(data);
    return computedHash === hash;
  // 安全清理所有数据
  async secureWipe(): Promise<void> {
      const securityKeys = keys.filter(key => 
        key.startsWith('secure_') || 
        key.startsWith('auth_') || 
        key.startsWith('token_')
      );
      await AsyncStorage.multiRemove(securityKeys);
      this.loginAttempts.clear();
      LoggerService.debug('Secure wipe completed');
      LoggerService.error('Secure wipe failed:', error);
  // 获取安全统计
  getSecurityStats() {
      loginAttempts: this.loginAttempts.size,
      config: {
        tokenExpiry: this.config.tokenExpiry,
        maxLoginAttempts: this.config.maxLoginAttempts,
        lockoutDuration: this.config.lockoutDuration,
      },
  // 生成加密密钥
  private generateKey(type: SensitiveDataType): string {
    return CryptoJS.SHA256(`${this.config.encryptionKey}_${type}`).toString();
  // 生成安全存储键
  private generateSecureKey(key: string): string {
    return `secure_${this.generateHash(key)}`;
// 数据脱敏工具
export class DataMaskingUtils {
  // 脱敏手机号
  static maskPhone(phone: string): string {
    if (phone.length < 4) return phone;
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  // 脱敏邮箱
  static maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    if (username.length <= 2) return email;
    const maskedUsername = username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1);
    return `${maskedUsername}@${domain}`;
  // 脱敏地址
  static maskAddress(address: string): string {
    if (address.length <= 6) return address;
    return address.substring(0, 3) + '*'.repeat(address.length - 6) + address.substring(address.length - 3);
  // 脱敏身份证号
  static maskIdCard(idCard: string): string {
    if (idCard.length < 8) return idCard;
    return idCard.substring(0, 4) + '*'.repeat(idCard.length - 8) + idCard.substring(idCard.length - 4);
  // 脱敏银行卡号
  static maskBankCard(cardNumber: string): string {
    if (cardNumber.length < 8) return cardNumber;
    return cardNumber.substring(0, 4) + '*'.repeat(cardNumber.length - 8) + cardNumber.substring(cardNumber.length - 4);
// 安全验证工具
export class SecurityValidationUtils {
  // 验证手机号格式
  static validatePhone(phone: string): boolean {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  // 验证邮箱格式
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  // 验证密码复杂度
  static validatePassword(password: string): boolean {
    // 至少8位，包含字母和数字
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
    return passwordRegex.test(password);
  // 验证输入安全性
  static validateInput(input: string): { isValid: boolean; sanitized: string } {
    // 移除潜在的恶意字符
    const sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
      isValid: sanitized === input,
      sanitized,
// 导出单例实例
export const securityService = SecurityService.getInstance();
export { SensitiveDataType };
