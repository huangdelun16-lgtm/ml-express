import { notifyAdminTodosRefresh } from '../utils/adminTodoBridge';
import {
  formatBatchAssignMessage,
  isAssignablePackage,
  summarizeBatchAssign,
  type AssignablePackageLike,
  type BatchAssignItemResult,
  type BatchAssignSummary,
} from '../utils/batchAssign';
import { auditLogService, notificationService, packageService } from './supabase';

export type BatchAssignPackage = AssignablePackageLike & {
  id: string;
  sender_name?: string | null;
  receiver_name?: string | null;
  receiver_address?: string | null;
  delivery_speed?: string | null;
};

export type BatchAssignCourier = {
  id: string;
  name: string;
};

export type BatchAssignResult = BatchAssignSummary & {
  results: BatchAssignItemResult[];
};

function readAssignActor(): { user_id: string; user_name: string } {
  return {
    user_id:
      sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser') || 'admin_system',
    user_name:
      sessionStorage.getItem('currentUserName') ||
      localStorage.getItem('currentUserName') ||
      '系统管理员',
  };
}

export async function assignPackagesToCourier(
  packages: BatchAssignPackage[],
  courier: BatchAssignCourier,
): Promise<BatchAssignResult> {
  const results: BatchAssignItemResult[] = [];

  for (const pkg of packages) {
    if (!pkg.id) {
      results.push({ packageId: '', ok: false, notified: false, error: '缺少单号' });
      continue;
    }
    if (!isAssignablePackage(pkg)) {
      results.push({
        packageId: pkg.id,
        ok: false,
        notified: false,
        error: '该单已分配或状态不可派',
      });
      continue;
    }

    try {
      const updated = await packageService.updatePackageStatus(
        pkg.id,
        '待取件',
        undefined,
        undefined,
        courier.name,
      );
      if (!updated) {
        results.push({
          packageId: pkg.id,
          ok: false,
          notified: false,
          error: '状态更新失败',
        });
        continue;
      }

      const notified = await notificationService.sendPackageAssignedNotification(
        courier.id,
        courier.name,
        pkg.id,
        {
          sender: pkg.sender_name || '',
          receiver: pkg.receiver_name || '',
          receiverAddress: pkg.receiver_address || '',
          deliverySpeed: pkg.delivery_speed || undefined,
        },
      );
      results.push({ packageId: pkg.id, ok: true, notified });
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      results.push({ packageId: pkg.id, ok: false, notified: false, error: message });
    }
  }

  const summary = summarizeBatchAssign(results);
  try {
    const actor = readAssignActor();
    await auditLogService.log({
      user_id: actor.user_id,
      user_name: actor.user_name,
      action_type: 'update',
      module: 'packages',
      target_id: summary.successIds[0] || packages[0]?.id,
      target_name: `批量派单 ${packages.length} 件 → ${courier.name}`,
      action_description: `分配给 ${courier.name}，成功 ${summary.success}，失败 ${summary.failed}，通知 ${summary.notified}`,
      new_value: JSON.stringify({
        courier: courier.name,
        courier_id: courier.id,
        successIds: summary.successIds,
        errors: summary.errors,
      }),
    });
  } catch (logError) {
    console.warn('记录批量派单审计失败:', logError);
  }

  notifyAdminTodosRefresh();
  return { ...summary, results };
}

export { formatBatchAssignMessage };
