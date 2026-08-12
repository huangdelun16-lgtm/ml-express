import { createBannerService } from '../_shared/services';
import LoggerService from '../LoggerService';
import { supabase } from './supabaseClient';

export const bannerService = createBannerService(supabase, LoggerService);
