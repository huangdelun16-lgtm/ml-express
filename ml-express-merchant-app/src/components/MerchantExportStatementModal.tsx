import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { ExportFormat, ExportMethod } from '../services/exportMerchantStatement';

type Lang = 'zh' | 'en' | 'my';

interface Props {
  open: boolean;
  language: string;
  isExporting: boolean;
  startDate: string;
  endDate: string;
  format: ExportFormat;
  method: ExportMethod;
  recipientEmail?: string;
  onClose: () => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onFormatChange: (value: ExportFormat) => void;
  onMethodChange: (value: ExportMethod) => void;
  onExport: () => void;
}

function shiftDate(value: string, days: number): string {
  const [y, m, d] = value.split('-').map((part) => parseInt(part, 10));
  const next = new Date(y || 2026, (m || 1) - 1, (d || 1) + days);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

function copy(language: string) {
  if (language === 'en') {
    return {
      title: 'Export Statement',
      hint: 'Pick a date range and how to send the file',
      start: 'Start date',
      end: 'End date',
      format: 'File format',
      excel: 'Excel (CSV)',
      method: 'Export method',
      share: 'Share / Save',
      email: 'Email',
      sendTo: 'Will send to',
      noEmail: 'No store email on file',
      run: 'Generate & Export',
      generating: 'Generating…',
    };
  }
  if (language === 'my') {
    return {
      title: 'စာရင်းချုပ် ထုတ်ရန်',
      hint: 'ရက်စွဲနှင့် ပို့ပုံ ရွေးပါ',
      start: 'စတင်ရက်',
      end: 'ပြီးဆုံးရက်',
      format: 'ဖိုင်အမျိုးအစား',
      excel: 'Excel (CSV)',
      method: 'ထုတ်ယူပုံ',
      share: 'မျှဝေ / သိမ်းရန်',
      email: 'အီးမေးလ်',
      sendTo: 'ပို့မည့်လိပ်စာ',
      noEmail: 'ဆိုင်အီးမေးလ် မရှိသေးပါ',
      run: 'ထုတ်ယူရန်',
      generating: 'ဖန်တီးနေသည်…',
    };
  }
  return {
    title: '导出结算对账单',
    hint: '选择日期范围和导出方式',
    start: '开始日期',
    end: '结束日期',
    format: '文件格式',
    excel: 'Excel (CSV)',
    method: '导出方式',
    share: '分享 / 保存',
    email: '发送至邮箱',
    sendTo: '将发送至',
    noEmail: '尚未绑定店铺邮箱',
    run: '立即执行导出',
    generating: '正在生成…',
  };
}

const DateStepper: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <View style={{ flex: 1 }}>
    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>
      {label}
    </Text>
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.25)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
      }}
    >
      <TouchableOpacity onPress={() => onChange(shiftDate(value, -1))} style={{ padding: 10 }}>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>‹</Text>
      </TouchableOpacity>
      <Text
        style={{
          flex: 1,
          textAlign: 'center',
          color: '#fff',
          fontWeight: '800',
          fontSize: 13,
        }}
      >
        {value}
      </Text>
      <TouchableOpacity onPress={() => onChange(shiftDate(value, 1))} style={{ padding: 10 }}>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>›</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const Choice: React.FC<{
  active: boolean;
  label: string;
  onPress: () => void;
  accent?: string;
}> = ({ active, label, onPress, accent = '#6366f1' }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: active ? accent : 'rgba(255,255,255,0.06)',
      alignItems: 'center',
    }}
  >
    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{label}</Text>
  </TouchableOpacity>
);

const MerchantExportStatementModal: React.FC<Props> = ({
  open,
  language,
  isExporting,
  startDate,
  endDate,
  format,
  method,
  recipientEmail,
  onClose,
  onStartDateChange,
  onEndDateChange,
  onFormatChange,
  onMethodChange,
  onExport,
}) => {
  const t = copy(language);
  const lang = (language === 'en' || language === 'my' ? language : 'zh') as Lang;

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => !isExporting && onClose()}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.82)',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: '#1e293b',
            borderRadius: 28,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        >
          <View style={{ backgroundColor: '#4f46e5', paddingVertical: 22, paddingHorizontal: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 36, marginBottom: 6 }}>📊</Text>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>{t.title}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 6 }}>{t.hint}</Text>
          </View>

          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <DateStepper label={t.start} value={startDate} onChange={onStartDateChange} />
              <DateStepper label={t.end} value={endDate} onChange={onEndDateChange} />
            </View>

            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700', marginBottom: 10 }}>
              {t.format}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
              <Choice active={format === 'pdf'} label="PDF" onPress={() => onFormatChange('pdf')} />
              <Choice active={format === 'excel'} label={t.excel} onPress={() => onFormatChange('excel')} />
            </View>

            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700', marginBottom: 10 }}>
              {t.method}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              <Choice
                active={method === 'download'}
                label={`⬇️ ${t.share}`}
                accent="#10b981"
                onPress={() => onMethodChange('download')}
              />
              <Choice
                active={method === 'email'}
                label={`📧 ${t.email}`}
                accent="#10b981"
                onPress={() => onMethodChange('email')}
              />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginBottom: 18 }}>
              {method === 'email'
                ? recipientEmail
                  ? `${t.sendTo}: ${recipientEmail}`
                  : t.noEmail
                : lang === 'zh'
                  ? '分享到文件、微信或邮箱应用'
                  : 'Share to Files, email or chat'}
            </Text>

            <TouchableOpacity
              onPress={onExport}
              disabled={isExporting}
              style={{
                backgroundColor: '#4f46e5',
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                opacity: isExporting ? 0.7 : 1,
              }}
            >
              {isExporting ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '800' }}>{t.generating}</Text>
                </View>
              ) : (
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>🚀 {t.run}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} disabled={isExporting} style={{ paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.55)', fontWeight: '700' }}>
                {lang === 'zh' ? '取消' : lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default MerchantExportStatementModal;
