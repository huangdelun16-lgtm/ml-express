import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Vibration } from 'react-native';
import { Text, Button, Card, TextInput, Dialog, Portal, Snackbar, Chip, Divider, Switch } from 'react-native-paper';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { api } from '../../src/api';
import * as SecureStore from 'expo-secure-store';
import { EnhancedCard } from '../../src/components/EnhancedCard';
import { StatusIndicator } from '../../src/components/StatusIndicator';
import { LoadingAnimation } from '../../src/components/LoadingAnimation';
import { DesignTokens } from '../../src/designSystem';

export default function Scan() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [last, setLast] = useState<string>('');
  const [queue, setQueue] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [openBind, setOpenBind] = useState(false);
  const [freightNo, setFreightNo] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; text: string }>()
  const [manual, setManual] = useState('');
  const [autoCreate, setAutoCreate] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      // 读取上次货运号
      try { const saved = await SecureStore.getItemAsync('ml_last_freight'); if (saved) setFreightNo(saved); } catch {}
    })();
  }, []);

  const confirmBind = async () => {
    const list = queue.length ? queue : (last ? [last] : []);
    if (!list.length || !freightNo.trim()) return;
    setBusy(true);
    try {
      let shipmentId: string | undefined;
      try {
        const created = await api.createShipment(freightNo.trim());
        shipmentId = created?.id;
      } catch {}
      if (!shipmentId) {
        // 若创建未返回 id，则直接尝试绑定，若不存在会报错
        shipmentId = freightNo.trim();
      }
      await api.addPackagesToShipment(String(shipmentId), list);
      try { await SecureStore.setItemAsync('ml_last_freight', freightNo.trim()); } catch {}
      setOpenBind(false);
      setFreightNo(freightNo.trim());
      setQueue([]);
      setToast({ visible: true, text: `已加入运单：${list.length} 个单号` });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || '绑定失败';
      setToast({ visible: true, text: String(msg) });
    } finally { setBusy(false); }
  };

  if (hasPermission === null) return (
    <View style={s.center}>
      <LoadingAnimation type="spinner" size="large" text="请求相机权限..." />
    </View>
  );
  if (hasPermission === false) return (
    <View style={s.center}>
      <EnhancedCard variant="error" size="medium">
        <Text>未获得相机权限</Text>
        <Text variant="bodySmall" style={{ marginTop: 8, color: DesignTokens.colors.text.secondary }}>请在设置中允许应用访问相机</Text>
      </EnhancedCard>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <EnhancedCard variant="primary" size="medium" style={{ margin: DesignTokens.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ color: DesignTokens.colors.text.primary }}>扫码装车 / 出库</Text>
            <Text variant="bodySmall" style={{ color: DesignTokens.colors.text.secondary, marginTop: 4 }}>对准单号二维码即可识别，识别后可加入运单</Text>
          </View>
          <StatusIndicator 
            status={enabled ? (isScanning ? 'processing' : 'active') : 'inactive'} 
            size="medium"
            label={enabled ? (isScanning ? '扫描中' : '就绪') : '暂停'}
          />
        </View>
      </EnhancedCard>
      {enabled && (
        <BarCodeScanner
          onBarCodeScanned={({ data }) => {
            setEnabled(false);
            setIsScanning(true);
            const t = String(data).trim();
            setLast(t);
            (async () => {
              if (autoCreate) {
                try {
                  await api.createPackage({ trackingNumber: t, status: '已入库' });
                  setToast({ visible: true, text: `已创建包裹：${t}` });
                } catch (e: any) {
                  const st = e?.response?.status;
                  const msg = e?.response?.data?.message || e?.message || '';
                  if (st === 409) {
                    // 已存在，正常加入队列
                    setToast({ visible: true, text: `已存在：${t}，加入列表` });
                  } else {
                    setToast({ visible: true, text: `创建失败：${msg}` });
                  }
                }
              }
              setQueue(prev => (prev.includes(t) ? prev : [...prev, t]));
            })().finally(() => {
              try { Vibration.vibrate(20); } catch {}
              setIsScanning(false);
              setTimeout(()=> setEnabled(true), 700);
            });
          }}
          style={{ flex: 1 }}
        />
      )}
      {/* 手动输入补录 */}
      <EnhancedCard variant="secondary" size="medium" style={{ margin: DesignTokens.spacing.md }}>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: DesignTokens.spacing.sm }}>
          <Text style={{ color: DesignTokens.colors.text.primary }}>扫码即建包裹</Text>
          <Switch value={autoCreate} onValueChange={setAutoCreate} />
        </View>
        <TextInput 
          placeholder="手动输入单号" 
          value={manual} 
          onChangeText={setManual} 
          style={{ marginBottom: DesignTokens.spacing.sm }} 
        />
        <Button 
          mode="outlined" 
          onPress={()=>{ 
            const t = manual.trim(); 
            if (t) { 
              setQueue(prev=> prev.includes(t)? prev : [...prev, t]); 
              setLast(t); 
              setManual(''); 
            } 
          }}
          style={{ borderColor: DesignTokens.colors.primary.main }}
        >
          加入列表
        </Button>
      </EnhancedCard>
      <View style={[s.panel, { backgroundColor: DesignTokens.colors.surface.primary, borderTopColor: DesignTokens.colors.border.light }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: DesignTokens.colors.text.primary }}>最近扫码：{last || '—'}</Text>
          {!!queue.length && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <StatusIndicator status="pending" size="small" />
              <Text variant="bodySmall" style={{ color: DesignTokens.colors.text.secondary, marginLeft: 4 }}>待加入：{queue.length} 个</Text>
            </View>
          )}
        </View>
        <Button 
          mode="text" 
          onPress={()=> setEnabled(v=>!v)}
          textColor={DesignTokens.colors.primary.main}
        >
          {enabled ? '暂停扫描' : '继续扫描'}
        </Button>
        <Button 
          mode="outlined" 
          onPress={()=> setQueue([])} 
          disabled={!queue.length}
          style={{ borderColor: DesignTokens.colors.secondary.main }}
        >
          清空
        </Button>
        <Button 
          mode="contained" 
          disabled={!last && !queue.length} 
          onPress={()=> setOpenBind(true)} 
          style={{ marginLeft: DesignTokens.spacing.sm, backgroundColor: DesignTokens.colors.primary.main }}
        >
          加入运单
        </Button>
      </View>

      <Portal>
        <Dialog visible={openBind} onDismiss={()=>setOpenBind(false)}>
          <Dialog.Title>加入运单</Dialog.Title>
          <Dialog.Content>
            <TextInput label="货运号" value={freightNo} onChangeText={setFreightNo} />
            <Text variant="bodySmall" style={{ marginTop: 8, color:'#666' }}>将加入的单号（{queue.length || (last?1:0)}）</Text>
            <View style={{ flexDirection:'row', flexWrap:'wrap', marginTop: 6 }}>
              {(queue.length ? queue : (last ? [last] : [])).map(t => (
                <Chip key={t} style={{ marginRight: 6, marginBottom: 6 }} onClose={()=> setQueue(prev => prev.filter(x=>x!==t))}>{t}</Chip>
              ))}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={()=>setOpenBind(false)}>取消</Button>
            <Button loading={busy} disabled={busy} onPress={confirmBind}>确认</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!toast?.visible} onDismiss={()=>setToast({ visible:false, text:'' })} duration={1800}>
        {toast?.text || ''}
      </Snackbar>
    </View>
  );
}

const s = StyleSheet.create({
  center: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: DesignTokens.spacing.lg
  },
  panel: { 
    padding: DesignTokens.spacing.md, 
    backgroundColor: DesignTokens.colors.surface.primary, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    borderTopWidth: 1, 
    borderTopColor: DesignTokens.colors.border.light,
    ...DesignTokens.shadows.small
  },
});
