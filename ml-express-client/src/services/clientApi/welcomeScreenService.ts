import { supabase } from './supabaseClient';
import LoggerService from '../LoggerService';
import type { WelcomeScreen } from './types';

export const welcomeScreenService = {
  async getActiveWelcomeScreen(): Promise<WelcomeScreen | null> {
    try {
      const { data, error } = await supabase
        .from('welcome_screens')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        LoggerService.error('获取活跃欢迎页失败:', error);
        return null;
      }
      return data;
    } catch (err) {
      LoggerService.error('获取活跃欢迎页异常:', err);
      return null;
    }
  }
};


