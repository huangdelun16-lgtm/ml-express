import { createTutorialService } from '../_shared/services';
import LoggerService from '../LoggerService';
import { supabase } from './supabaseClient';

export const tutorialService = createTutorialService(supabase, LoggerService);
