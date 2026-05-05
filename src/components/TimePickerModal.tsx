/**
 * Pure React Native time picker — no native modules, no scroll wheels.
 * Uses +/− stepper buttons so the selected value is always exact.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';

function pad(n: number) { return String(n).padStart(2, '0'); }

function formatPreview(hour: number, minute: number): string {
  return `${pad(hour)}:${pad(minute)}`;
}

// ─── Single stepper column ────────────────────────────────────────────────────

interface StepperProps {
  value: number;
  min: number;
  max: number;
  format?: (v: number) => string;
  label: string;
  onChange: (v: number) => void;
}

function Stepper({ value, min, max, format = pad, label, onChange }: StepperProps) {
  const decrement = useCallback(() => {
    Haptics.selectionAsync();
    onChange(value <= min ? max : value - 1);
  }, [value, min, max, onChange]);

  const increment = useCallback(() => {
    Haptics.selectionAsync();
    onChange(value >= max ? min : value + 1);
  }, [value, min, max, onChange]);

  return (
    <View style={step.col}>
      <Text style={step.label}>{label}</Text>
      <TouchableOpacity style={step.arrowBtn} onPress={increment} activeOpacity={0.6}>
        <Text style={step.arrow}>▲</Text>
      </TouchableOpacity>
      <View style={step.valueBox}>
        <Text style={step.value}>{format(value)}</Text>
      </View>
      <TouchableOpacity style={step.arrowBtn} onPress={decrement} activeOpacity={0.6}>
        <Text style={step.arrow}>▼</Text>
      </TouchableOpacity>
    </View>
  );
}

const step = StyleSheet.create({
  col: { alignItems: 'center', gap: 6 },
  label: { fontSize: 11, fontWeight: '700', color: '#7A8B9A', letterSpacing: 1, marginBottom: 2 },
  arrowBtn: {
    width: 52, height: 40,
    backgroundColor: '#E0F7FA', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  arrow: { fontSize: 18, color: '#00838F', fontWeight: '700' },
  valueBox: {
    width: 88, height: 64,
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 2, borderColor: '#00BCD4',
    alignItems: 'center', justifyContent: 'center',
  },
  value: { fontSize: 34, fontWeight: '800', color: '#1A2B3C' },
});

// ─── Minute quick-jump chips ──────────────────────────────────────────────────

const MINUTE_PRESETS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

interface MinutePresetsProps {
  selected: number;
  onSelect: (m: number) => void;
}

function MinutePresets({ selected, onSelect }: MinutePresetsProps) {
  return (
    <View style={mp.wrap}>
      {MINUTE_PRESETS.map(m => (
        <TouchableOpacity
          key={m}
          style={[mp.chip, m === selected && mp.chipActive]}
          onPress={() => { Haptics.selectionAsync(); onSelect(m); }}
          activeOpacity={0.7}
        >
          <Text style={[mp.chipText, m === selected && mp.chipTextActive]}>
            :{pad(m)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const mp = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingHorizontal: 16 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, backgroundColor: '#F5F9FA',
    borderWidth: 1.5, borderColor: '#E8EFF3',
  },
  chipActive: { backgroundColor: '#00BCD4', borderColor: '#00BCD4' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#7A8B9A' },
  chipTextActive: { color: '#FFFFFF' },
});

// ─── Hour AM/PM quick-flip ────────────────────────────────────────────────────

interface AmPmToggleProps {
  hour: number;
  onChange: (h: number) => void;
}

function AmPmToggle({ hour, onChange }: AmPmToggleProps) {
  const isAm = hour < 12;
  return (
    <View style={ap.row}>
      <TouchableOpacity
        style={[ap.btn, isAm && ap.btnActive]}
        onPress={() => { if (!isAm) { Haptics.selectionAsync(); onChange(hour - 12); } }}
        activeOpacity={0.7}
      >
        <Text style={[ap.btnText, isAm && ap.btnTextActive]}>AM</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[ap.btn, !isAm && ap.btnActive]}
        onPress={() => { if (isAm) { Haptics.selectionAsync(); onChange(hour === 0 ? 12 : hour + 12); } }}
        activeOpacity={0.7}
      >
        <Text style={[ap.btnText, !isAm && ap.btnTextActive]}>PM</Text>
      </TouchableOpacity>
    </View>
  );
}

const ap = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  btn: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 12, backgroundColor: '#F5F9FA',
    borderWidth: 1.5, borderColor: '#E8EFF3',
  },
  btnActive: { backgroundColor: '#1A2B3C', borderColor: '#1A2B3C' },
  btnText: { fontSize: 14, fontWeight: '700', color: '#7A8B9A' },
  btnTextActive: { color: '#FFFFFF' },
});

// ─── Public component ─────────────────────────────────────────────────────────

export interface TimePickerModalProps {
  visible: boolean;
  initialTime?: string;   // "HH:MM"
  title?: string;
  onConfirm: (timeKey: string) => void;
  onCancel: () => void;
}

export default function TimePickerModal({
  visible,
  initialTime = '08:00',
  title = 'Set Time',
  onConfirm,
  onCancel,
}: TimePickerModalProps) {
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    if (visible) {
      const [h, m] = initialTime.split(':').map(Number);
      setHour(isNaN(h) ? 8 : Math.max(0, Math.min(23, h)));
      setMinute(isNaN(m) ? 0 : Math.max(0, Math.min(59, m)));
    }
  }, [visible, initialTime]);

  // Display hours as 1–12 in the stepper (but store 0–23 internally)
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  const handleHourStepperChange = useCallback((displayVal: number) => {
    // Convert 12-hour stepper value back to 24-hour, preserving AM/PM
    const isAm = hour < 12;
    let h24 = displayVal % 12;               // 12→0, 1→1 … 11→11
    if (!isAm) h24 += 12;                    // PM offset
    setHour(h24);
  }, [hour]);

  const handleConfirm = useCallback(() => {
    onConfirm(`${pad(hour)}:${pad(minute)}`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [hour, minute, onConfirm]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity activeOpacity={1} style={s.sheet}>

          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={s.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.title}>{title}</Text>
            <TouchableOpacity onPress={handleConfirm} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={s.set}>Set</Text>
            </TouchableOpacity>
          </View>

          {/* Steppers */}
          <View style={s.stepperRow}>
            <Stepper
              value={displayHour}
              min={1}
              max={12}
              label="HOUR"
              onChange={handleHourStepperChange}
            />
            <Text style={s.colon}>:</Text>
            <Stepper
              value={minute}
              min={0}
              max={59}
              label="MIN"
              onChange={setMinute}
            />
            <View style={s.ampmCol}>
              <Text style={s.ampmLabel}>AM/PM</Text>
              <AmPmToggle hour={hour} onChange={setHour} />
            </View>
          </View>

          {/* Preview */}
          <Text style={s.preview}>{formatPreview(hour, minute)}</Text>

          {/* Minute quick-picks */}
          <Text style={s.quickLabel}>QUICK MINUTES</Text>
          <MinutePresets selected={minute} onSelect={setMinute} />

          <View style={s.confirmRow}>
            <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
              <Text style={s.confirmBtnText}>Set {formatPreview(hour, minute)}</Text>
            </TouchableOpacity>
          </View>

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#F5F9FA',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 36, overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E8EFF3',
  },
  title: { fontSize: 16, fontWeight: '700', color: '#1A2B3C' },
  cancel: { fontSize: 15, color: '#7A8B9A', fontWeight: '500' },
  set: { fontSize: 15, color: '#00BCD4', fontWeight: '700' },

  stepperRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 16, paddingTop: 24, paddingBottom: 8, paddingHorizontal: 16,
  },
  colon: { fontSize: 36, fontWeight: '800', color: '#1A2B3C', marginTop: 24 },
  ampmCol: { alignItems: 'center', gap: 8, marginTop: 24 },
  ampmLabel: { fontSize: 11, fontWeight: '700', color: '#7A8B9A', letterSpacing: 1 },

  preview: {
    textAlign: 'center', fontSize: 15, fontWeight: '700',
    color: '#00838F', marginBottom: 16,
  },

  quickLabel: {
    fontSize: 10, fontWeight: '700', color: '#B0BEC5',
    letterSpacing: 1.2, textAlign: 'center', marginBottom: 10,
  },

  confirmRow: { paddingHorizontal: 20, paddingTop: 20 },
  confirmBtn: {
    backgroundColor: '#00BCD4', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#00BCD4', shadowOpacity: 0.35, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
