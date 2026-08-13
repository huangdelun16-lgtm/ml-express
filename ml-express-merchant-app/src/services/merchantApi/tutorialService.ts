import { supabase } from "./supabaseClient";
import LoggerService from "../LoggerService";
import { createTutorialService } from "../_shared/services";

// 🚀 新增：使用教学服务
// tutorialService.getAllTutorials 实现见 /shared/src/services.ts
export const tutorialService = createTutorialService(supabase, LoggerService);
