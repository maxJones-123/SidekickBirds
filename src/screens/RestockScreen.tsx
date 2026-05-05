import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, Linking, Share, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { Medication } from '../types';

const REORDER_AMOUNTS = [14, 28, 30, 56, 60, 90];
const REPEAT_INTERVALS = [
  { label: '28 days', days: 28 },
  { label: '56 days', days: 56 },
  { label: '84 days', days: 84 },
  { label: '90 days', days: 90 },
];
const LOW_THRESHOLD = 7;
const REPEAT_WARN_DAYS = 7; // warn this many days before due

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(ms: number): string {
  const d = new Date(ms);
  const today = new Date();
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 0 && diff < 7) return `In ${diff} days`;
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function addDays(n: number): number {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
}

function getRepeatStatus(med: Medication): {
  label: string;
  sublabel: string;
  urgency: 'ok' | 'soon' | 'due' | 'overdue';
  nextDueMs: number | null;
} {
  if (!med.repeatRequestedAt) {
    return {
      label: 'Not yet requested',
      sublabel: 'Tap to request your first repeat',
      urgency: 'due',
      nextDueMs: null,
    };
  }
  const nextDueMs = med.repeatRequestedAt + med.repeatEveryDays * 86400000;
  const daysLeft = Math.round((nextDueMs - Date.now()) / 86400000);

  if (daysLeft < 0) {
    return {
      label: `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} overdue`,
      sublabel: `Request was due ${formatDate(nextDueMs)}`,
      urgency: 'overdue',
      nextDueMs,
    };
  }
  if (daysLeft === 0) {
    return { label: 'Due today', sublabel: 'Time to request your repeat', urgency: 'overdue', nextDueMs };
  }
  if (daysLeft <= REPEAT_WARN_DAYS) {
    return {
      label: `Due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
      sublabel: `Request by ${formatDate(nextDueMs)}`,
      urgency: 'soon',
      nextDueMs,
    };
  }
  return {
    label: `Due ${formatDate(nextDueMs)}`,
    sublabel: med.repeatRequestedAt
      ? `Last requested ${formatDate(med.repeatRequestedAt)}`
      : `Every ${med.repeatEveryDays} days`,
    urgency: 'ok',
    nextDueMs,
  };
}

// ─── Pill Count Bar ───────────────────────────────────────────────────────────

function PillCountBar({ count, max }: { count: number; max: number }) {
  const pct = Math.min((count / max) * 100, 100);
  const colour = count <= LOW_THRESHOLD ? '#F44336' : count <= 14 ? '#FF9800' : '#4CAF50';
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: colour }]} />
    </View>
  );
}

// ─── Restock Reminder Modal ───────────────────────────────────────────────────

const REMINDER_OPTIONS = [
  { label: 'Tomorrow',   days: 1 },
  { label: 'In 2 days',  days: 2 },
  { label: 'In 3 days',  days: 3 },
  { label: 'In 1 week',  days: 7 },
  { label: 'In 2 weeks', days: 14 },
];

interface ReminderModalProps {
  visible: boolean;
  medName: string;
  current: number | null;
  onSet: (ms: number) => void;
  onClear: () => void;
  onClose: () => void;
}

function ReminderModal({ visible, medName, current, onSet, onClear, onClose }: ReminderModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.sheet}>
          <Text style={modalStyles.title}>Reorder Reminder</Text>
          <Text style={modalStyles.subtitle}>When should we remind you to reorder {medName}?</Text>
          {REMINDER_OPTIONS.map(opt => {
            const ms = addDays(opt.days);
            const isSelected = current !== null && Math.abs(current - ms) < 86400000;
            return (
              <TouchableOpacity
                key={opt.days}
                style={[modalStyles.optionRow, isSelected && modalStyles.optionRowSelected]}
                onPress={() => { onSet(ms); onClose(); }}
                activeOpacity={0.75}
              >
                <Text style={[modalStyles.optionText, isSelected && modalStyles.optionTextSelected]}>{opt.label}</Text>
                {isSelected && <Text style={modalStyles.optionCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })}
          {current && (
            <TouchableOpacity style={modalStyles.clearBtn} onPress={() => { onClear(); onClose(); }} activeOpacity={0.7}>
              <Text style={modalStyles.clearBtnText}>Remove reminder</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={modalStyles.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Repeat Setup Modal ───────────────────────────────────────────────────────

interface RepeatSetupModalProps {
  visible: boolean;
  med: Medication;
  onSave: (enabled: boolean, days: number, phone: string) => void;
  onClose: () => void;
}

function RepeatSetupModal({ visible, med, onSave, onClose }: RepeatSetupModalProps) {
  const [enabled, setEnabled] = useState(med.isRepeat);
  const [days, setDays] = useState(med.repeatEveryDays);
  const [phone, setPhone] = useState(med.pharmacyPhone);

  // Sync when med changes
  React.useEffect(() => {
    setEnabled(med.isRepeat);
    setDays(med.repeatEveryDays);
    setPhone(med.pharmacyPhone);
  }, [med.id, visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <View style={[modalStyles.sheet, { width: '92%' }]}>
          <Text style={modalStyles.title}>Repeat Prescription</Text>
          <Text style={modalStyles.subtitle}>{med.name}</Text>

          {/* Toggle */}
          <View style={repeatStyles.toggleRow}>
            <Text style={repeatStyles.toggleLabel}>Track as repeat prescription</Text>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: '#E8EFF3', true: '#00BCD4' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {enabled && (
            <>
              {/* Interval */}
              <Text style={repeatStyles.fieldLabel}>PRESCRIPTION CYCLE</Text>
              <View style={repeatStyles.chipRow}>
                {REPEAT_INTERVALS.map(opt => (
                  <TouchableOpacity
                    key={opt.days}
                    style={[repeatStyles.chip, days === opt.days && repeatStyles.chipSelected]}
                    onPress={() => { setDays(opt.days); Haptics.selectionAsync(); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[repeatStyles.chipText, days === opt.days && repeatStyles.chipTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Pharmacy phone */}
              <Text style={repeatStyles.fieldLabel}>PHARMACY PHONE (OPTIONAL)</Text>
              <TextInput
                style={repeatStyles.phoneInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="e.g. 01234 567890"
                placeholderTextColor="#B0BEC5"
                keyboardType="phone-pad"
              />
            </>
          )}

          <TouchableOpacity
            style={repeatStyles.saveBtn}
            onPress={() => { onSave(enabled, days, phone); onClose(); }}
            activeOpacity={0.85}
          >
            <Text style={repeatStyles.saveBtnText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={modalStyles.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Repeat Request Modal ─────────────────────────────────────────────────────

interface RepeatRequestModalProps {
  visible: boolean;
  med: Medication;
  onMarkRequested: () => void;
  onClose: () => void;
}

function RepeatRequestModal({ visible, med, onMarkRequested, onClose }: RepeatRequestModalProps) {
  const prescriptionText =
    `Repeat Prescription Request\n\nPatient name: [Your name]\nDate: ${new Date().toLocaleDateString('en-GB')}\n\nMedication:\n• ${med.name}${med.dose ? ` ${med.dose}` : ''}${med.form ? ` ${med.form}` : ''}\n  Frequency: ${med.frequency}\n\nPlease process my repeat prescription at your earliest convenience.\n\nThank you.`;

  const handleCall = useCallback(() => {
    if (!med.pharmacyPhone) return;
    const tel = `tel:${med.pharmacyPhone.replace(/\s/g, '')}`;
    Linking.canOpenURL(tel).then(can => {
      if (can) {
        Linking.openURL(tel);
        onMarkRequested();
        onClose();
      } else {
        Alert.alert('Cannot make call', 'Please dial your pharmacy manually.');
      }
    });
  }, [med.pharmacyPhone, onMarkRequested, onClose]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ message: prescriptionText });
      onMarkRequested();
      onClose();
    } catch {
      // user cancelled share
    }
  }, [prescriptionText, onMarkRequested, onClose]);

  const handleMarkOnly = useCallback(() => {
    onMarkRequested();
    onClose();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [onMarkRequested, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <View style={[modalStyles.sheet, { width: '92%' }]}>
          <Text style={modalStyles.title}>Request Repeat</Text>
          <Text style={modalStyles.subtitle}>{med.name}</Text>

          {/* Call pharmacy */}
          {med.pharmacyPhone ? (
            <TouchableOpacity style={requestStyles.actionBtn} onPress={handleCall} activeOpacity={0.85}>
              <Text style={requestStyles.actionIcon}>📞</Text>
              <View style={{ flex: 1 }}>
                <Text style={requestStyles.actionTitle}>Call Pharmacy</Text>
                <Text style={requestStyles.actionSub}>{med.pharmacyPhone}</Text>
              </View>
              <Text style={requestStyles.actionArrow}>›</Text>
            </TouchableOpacity>
          ) : (
            <View style={requestStyles.noPhoneHint}>
              <Text style={requestStyles.noPhoneText}>
                💡 Add your pharmacy phone number in the settings to enable one-tap calling.
              </Text>
            </View>
          )}

          {/* Share / email */}
          <TouchableOpacity style={requestStyles.actionBtn} onPress={handleShare} activeOpacity={0.85}>
            <Text style={requestStyles.actionIcon}>📤</Text>
            <View style={{ flex: 1 }}>
              <Text style={requestStyles.actionTitle}>Send Request</Text>
              <Text style={requestStyles.actionSub}>Share or email your prescription details</Text>
            </View>
            <Text style={requestStyles.actionArrow}>›</Text>
          </TouchableOpacity>

          {/* Mark only */}
          <TouchableOpacity style={requestStyles.markBtn} onPress={handleMarkOnly} activeOpacity={0.75}>
            <Text style={requestStyles.markBtnText}>✓  Mark as Requested</Text>
          </TouchableOpacity>

          <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={modalStyles.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Repeat Prescription Card ─────────────────────────────────────────────────

interface RepeatCardProps {
  med: Medication;
  onRequest: (med: Medication) => void;
  onSettings: (med: Medication) => void;
}

function RepeatCard({ med, onRequest, onSettings }: RepeatCardProps) {
  const { label, sublabel, urgency, nextDueMs } = getRepeatStatus(med);

  const urgencyColours = {
    ok:       { bg: '#F1FBF1', border: '#A5D6A7', dot: '#4CAF50' },
    soon:     { bg: '#FFF8E1', border: '#FFE082', dot: '#FF9800' },
    due:      { bg: '#FFF3E0', border: '#FFCC80', dot: '#FF9800' },
    overdue:  { bg: '#FFEBEE', border: '#EF9A9A', dot: '#F44336' },
  };
  const c = urgencyColours[urgency];

  return (
    <View style={[styles.repeatCard, { backgroundColor: c.bg, borderColor: c.border }]}>
      {/* Header */}
      <View style={styles.repeatCardHeader}>
        <View style={[styles.urgencyDot, { backgroundColor: c.dot }]} />
        <Text style={styles.repeatCardName} numberOfLines={1}>{med.name}</Text>
        <TouchableOpacity onPress={() => onSettings(med)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.repeatSettingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Status */}
      <Text style={styles.repeatStatusLabel}>{label}</Text>
      <Text style={styles.repeatStatusSub}>{sublabel}</Text>

      {/* Cycle info */}
      <View style={styles.repeatMeta}>
        <Text style={styles.repeatMetaText}>🔄 Every {med.repeatEveryDays} days</Text>
        {med.pharmacyPhone ? (
          <Text style={styles.repeatMetaText}>📞 {med.pharmacyPhone}</Text>
        ) : null}
      </View>

      {/* Request button */}
      <TouchableOpacity
        style={[styles.requestBtn, urgency === 'ok' && styles.requestBtnSubtle]}
        onPress={() => onRequest(med)}
        activeOpacity={0.85}
      >
        <Text style={[styles.requestBtnText, urgency === 'ok' && styles.requestBtnTextSubtle]}>
          {urgency === 'ok' ? 'Request Early' : 'Request Now →'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Reorder Card (for low stock) ────────────────────────────────────────────

interface ReorderCardProps {
  med: Medication;
  onAmountChange: (id: string, amount: number) => void;
  onSetReminder: (med: Medication) => void;
  onConfirmRestock: (id: string) => void;
}

function ReorderCard({ med, onAmountChange, onSetReminder, onConfirmRestock }: ReorderCardProps) {
  const urgency = med.pillCount === 0 ? 'critical' : med.pillCount! <= 3 ? 'urgent' : 'low';
  const cardColor = urgency === 'critical' ? '#FFEBEE' : urgency === 'urgent' ? '#FFF3E0' : '#FFF8E1';
  const borderColor = urgency === 'critical' ? '#EF9A9A' : urgency === 'urgent' ? '#FFCC80' : '#FFE082';
  const icon = urgency === 'critical' ? '🚨' : '⚠️';

  return (
    <View style={[styles.reorderCard, { backgroundColor: cardColor, borderColor }]}>
      <View style={styles.reorderHeader}>
        <Text style={styles.reorderIcon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.reorderMedName}>{med.name}</Text>
          <Text style={styles.reorderCountLabel}>
            {med.pillCount === 0 ? 'Out of stock!' : `${med.pillCount} tablet${med.pillCount === 1 ? '' : 's'} remaining`}
          </Text>
        </View>
        <Text style={styles.reorderCountBig}>{med.pillCount}</Text>
      </View>

      <PillCountBar count={med.pillCount!} max={Math.max(med.reorderAmount ?? 30, 30)} />

      <Text style={styles.reorderAmountLabel}>Reorder quantity</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.amountScroll}>
        <View style={styles.amountRow}>
          {REORDER_AMOUNTS.map(n => (
            <TouchableOpacity
              key={n}
              style={[styles.amountChip, med.reorderAmount === n && styles.amountChipSelected]}
              onPress={() => { onAmountChange(med.id, n); Haptics.selectionAsync(); }}
              activeOpacity={0.75}
            >
              <Text style={[styles.amountChipText, med.reorderAmount === n && styles.amountChipTextSelected]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.reminderRow}
        onPress={() => onSetReminder(med)}
        activeOpacity={0.7}
      >
        <Text style={styles.reminderRowIcon}>🔔</Text>
        <Text style={styles.reminderRowText}>
          {med.reorderReminderDate ? `Reminder set: ${formatDate(med.reorderReminderDate)}` : 'Set reorder reminder'}
        </Text>
        <Text style={styles.reminderRowChevron}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.restockBtn}
        onPress={() => Alert.alert(
          'Confirm restock',
          `Add ${med.reorderAmount ?? 30} tablets to ${med.name}?\n\nNew total: ${(med.pillCount ?? 0) + (med.reorderAmount ?? 30)} tablets`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: "I've Restocked ✓", onPress: () => { onConfirmRestock(med.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } },
          ]
        )}
        activeOpacity={0.85}
      >
        <Text style={styles.restockBtnText}>I've Restocked — +{med.reorderAmount ?? 30} tablets</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Med Row ──────────────────────────────────────────────────────────────────

interface MedRowProps {
  med: Medication;
  onUpdateCount: (id: string, count: number | null) => void;
  onRepeatSettings: (med: Medication) => void;
  isLow: boolean;
}

function MedRow({ med, onUpdateCount, onRepeatSettings, isLow }: MedRowProps) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(med.pillCount !== null ? String(med.pillCount) : '');
  const doseLabel = [med.dose, med.form].filter(Boolean).join(' ');

  const handleSave = useCallback(() => {
    const n = parseInt(inputVal, 10);
    onUpdateCount(med.id, !inputVal.trim() ? null : isNaN(n) || n < 0 ? med.pillCount : n);
    setEditing(false);
    Haptics.selectionAsync();
  }, [inputVal, med.id, med.pillCount, onUpdateCount]);

  const handleAdjust = useCallback((delta: number) => {
    const next = Math.max(0, (med.pillCount ?? 0) + delta);
    onUpdateCount(med.id, next);
    setInputVal(String(next));
    Haptics.selectionAsync();
  }, [med.id, med.pillCount, onUpdateCount]);

  return (
    <View style={[styles.medRow, isLow && styles.medRowLow]}>
      <View style={styles.medRowLeft}>
        <View style={styles.medRowNameRow}>
          {isLow && <Text style={styles.medRowWarningDot}>●</Text>}
          <Text style={styles.medRowName}>{med.name}</Text>
          {med.isRepeat && (
            <View style={styles.repeatBadge}>
              <Text style={styles.repeatBadgeText}>Repeat Rx</Text>
            </View>
          )}
        </View>
        {doseLabel ? <Text style={styles.medRowDose}>{doseLabel}</Text> : null}
        {med.pillCount !== null && (
          <PillCountBar count={med.pillCount} max={Math.max(med.reorderAmount ?? 30, 30)} />
        )}
      </View>

      <View style={styles.medRowRight}>
        {!med.isRepeat && (
          <TouchableOpacity
            style={styles.setRepeatBtn}
            onPress={() => onRepeatSettings(med)}
            activeOpacity={0.7}
          >
            <Text style={styles.setRepeatBtnText}>+ Repeat Rx</Text>
          </TouchableOpacity>
        )}
        {editing ? (
          <View style={styles.editGroup}>
            <TouchableOpacity style={styles.adjustBtn} onPress={() => handleAdjust(-1)}>
              <Text style={styles.adjustBtnText}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.countInput}
              value={inputVal}
              onChangeText={setInputVal}
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={handleSave}
              onBlur={handleSave}
              autoFocus
              selectTextOnFocus
            />
            <TouchableOpacity style={styles.adjustBtn} onPress={() => handleAdjust(1)}>
              <Text style={styles.adjustBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.countChip, isLow && styles.countChipLow]}
            onPress={() => { setInputVal(med.pillCount !== null ? String(med.pillCount) : ''); setEditing(true); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.countChipText, isLow && styles.countChipTextLow]}>
              {med.pillCount !== null ? `${med.pillCount} left` : 'Set count'}
            </Text>
            <Text style={styles.countChipEdit}>✎</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RestockScreen() {
  const { state, updatePillCount, setReorderAmount, setReorderReminder, confirmRestock, setRepeatSettings, markRepeatRequested } = useApp();
  const [reminderMed, setReminderMed] = useState<Medication | null>(null);
  const [setupMed, setSetupMed] = useState<Medication | null>(null);
  const [requestMed, setRequestMed] = useState<Medication | null>(null);

  const lowMeds = state.medications.filter(m => m.pillCount !== null && m.pillCount <= LOW_THRESHOLD);
  const repeatMeds = state.medications.filter(m => m.isRepeat);

  // Sort repeat meds: overdue first, then soonest due
  const sortedRepeatMeds = [...repeatMeds].sort((a, b) => {
    const statusA = getRepeatStatus(a);
    const statusB = getRepeatStatus(b);
    const priority = { overdue: 0, due: 1, soon: 2, ok: 3 };
    const pa = priority[statusA.urgency];
    const pb = priority[statusB.urgency];
    if (pa !== pb) return pa - pb;
    const na = statusA.nextDueMs ?? 0;
    const nb = statusB.nextDueMs ?? 0;
    return na - nb;
  });

  const handleSetReminder = useCallback((ms: number) => {
    if (!reminderMed) return;
    setReorderReminder(reminderMed.id, ms);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [reminderMed, setReorderReminder]);

  const handleSaveRepeatSettings = useCallback((enabled: boolean, days: number, phone: string) => {
    if (!setupMed) return;
    setRepeatSettings(setupMed.id, enabled, days, phone);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [setupMed, setRepeatSettings]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.headerTitle}>Restock</Text>

        {/* ── Repeat prescriptions ── */}
        {sortedRepeatMeds.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>REPEAT PRESCRIPTIONS</Text>
              {sortedRepeatMeds.some(m => ['overdue','due','soon'].includes(getRepeatStatus(m).urgency)) && (
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeCountText}>
                    {sortedRepeatMeds.filter(m => ['overdue','due','soon'].includes(getRepeatStatus(m).urgency)).length}
                  </Text>
                </View>
              )}
            </View>
            {sortedRepeatMeds.map(med => (
              <RepeatCard
                key={med.id}
                med={med}
                onRequest={m => setRequestMed(m)}
                onSettings={m => setSetupMed(m)}
              />
            ))}
          </>
        )}

        {/* ── Reorder needed (low stock) ── */}
        {lowMeds.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>REORDER NEEDED</Text>
              <View style={[styles.badgeCount, { backgroundColor: '#F44336' }]}>
                <Text style={styles.badgeCountText}>{lowMeds.length}</Text>
              </View>
            </View>
            {lowMeds.map(med => (
              <ReorderCard
                key={med.id}
                med={med}
                onAmountChange={setReorderAmount}
                onSetReminder={m => setReminderMed(m)}
                onConfirmRestock={confirmRestock}
              />
            ))}
          </>
        )}

        {/* ── All medications ── */}
        <Text style={[styles.sectionLabel, { marginTop: (lowMeds.length > 0 || sortedRepeatMeds.length > 0) ? 8 : 0 }]}>
          YOUR MEDICATIONS
        </Text>

        {state.medications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>💊</Text>
            <Text style={styles.emptyText}>No medications added yet.</Text>
          </View>
        ) : (
          <View style={styles.medsCard}>
            {state.medications.map((med, idx) => (
              <View key={med.id}>
                <MedRow
                  med={med}
                  onUpdateCount={updatePillCount}
                  onRepeatSettings={m => setSetupMed(m)}
                  isLow={med.pillCount !== null && med.pillCount <= LOW_THRESHOLD}
                />
                {idx < state.medications.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        )}

        {/* ── Upcoming reorder reminders ── */}
        {state.medications.some(m => m.reorderReminderDate) && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>UPCOMING REMINDERS</Text>
            <View style={styles.medsCard}>
              {state.medications
                .filter(m => m.reorderReminderDate)
                .sort((a, b) => (a.reorderReminderDate ?? 0) - (b.reorderReminderDate ?? 0))
                .map((med, idx, arr) => (
                  <View key={med.id}>
                    <TouchableOpacity
                      style={styles.reminderItem}
                      onPress={() => setReminderMed(med)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.reminderItemIcon}>🔔</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reminderItemName}>{med.name}</Text>
                        <Text style={styles.reminderItemDate}>{formatDate(med.reorderReminderDate!)}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.reminderClearBtn}
                        onPress={() => setReorderReminder(med.id, null)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={styles.reminderClearBtnText}>✕</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                    {idx < arr.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Modals */}
      {reminderMed && (
        <ReminderModal
          visible={!!reminderMed}
          medName={reminderMed.name}
          current={reminderMed.reorderReminderDate}
          onSet={handleSetReminder}
          onClear={() => { if (reminderMed) setReorderReminder(reminderMed.id, null); }}
          onClose={() => setReminderMed(null)}
        />
      )}
      {setupMed && (
        <RepeatSetupModal
          visible={!!setupMed}
          med={setupMed}
          onSave={handleSaveRepeatSettings}
          onClose={() => setSetupMed(null)}
        />
      )}
      {requestMed && (
        <RepeatRequestModal
          visible={!!requestMed}
          med={requestMed}
          onMarkRequested={() => markRepeatRequested(requestMed.id)}
          onClose={() => setRequestMed(null)}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F9FA' },
  scroll: { padding: 20, paddingBottom: 48 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1A2B3C', marginBottom: 20 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#7A8B9A', letterSpacing: 1.2, marginBottom: 10 },
  badgeCount: { backgroundColor: '#FF9800', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeCountText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // ── Repeat card ──
  repeatCard: {
    borderRadius: 18, borderWidth: 1.5,
    padding: 16, marginBottom: 10,
  },
  repeatCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  urgencyDot: { width: 10, height: 10, borderRadius: 5 },
  repeatCardName: { flex: 1, fontSize: 16, fontWeight: '800', color: '#1A2B3C' },
  repeatSettingsIcon: { fontSize: 16 },
  repeatStatusLabel: { fontSize: 15, fontWeight: '700', color: '#1A2B3C', marginBottom: 2 },
  repeatStatusSub: { fontSize: 12, color: '#7A8B9A', marginBottom: 10 },
  repeatMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  repeatMetaText: { fontSize: 12, color: '#7A8B9A' },
  requestBtn: {
    backgroundColor: '#00BCD4', borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  requestBtnSubtle: { backgroundColor: 'rgba(0,188,212,0.12)' },
  requestBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  requestBtnTextSubtle: { color: '#00838F' },

  // ── Reorder card ──
  reorderCard: { borderRadius: 18, borderWidth: 1.5, padding: 16, marginBottom: 12 },
  reorderHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  reorderIcon: { fontSize: 24 },
  reorderMedName: { fontSize: 16, fontWeight: '800', color: '#1A2B3C' },
  reorderCountLabel: { fontSize: 12, color: '#7A8B9A', marginTop: 2 },
  reorderCountBig: { fontSize: 28, fontWeight: '800', color: '#F44336', minWidth: 40, textAlign: 'right' },
  reorderAmountLabel: { fontSize: 12, fontWeight: '600', color: '#7A8B9A', marginTop: 14, marginBottom: 8 },
  amountScroll: { marginBottom: 12 },
  amountRow: { flexDirection: 'row', gap: 8 },
  amountChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E8EFF3' },
  amountChipSelected: { backgroundColor: '#00BCD4', borderColor: '#00BCD4' },
  amountChipText: { fontSize: 14, fontWeight: '600', color: '#7A8B9A' },
  amountChipTextSelected: { color: '#FFFFFF' },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12, padding: 12, marginBottom: 12 },
  reminderRowIcon: { fontSize: 18 },
  reminderRowText: { flex: 1, fontSize: 13, color: '#1A2B3C', fontWeight: '500' },
  reminderRowChevron: { fontSize: 18, color: '#B0BEC5' },
  restockBtn: { backgroundColor: '#00BCD4', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  restockBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // ── Bar ──
  barTrack: { height: 6, backgroundColor: '#E8EFF3', borderRadius: 3, overflow: 'hidden', marginVertical: 6 },
  barFill: { height: 6, borderRadius: 3 },

  // ── Meds list ──
  medsCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E8EFF3', overflow: 'hidden', marginBottom: 4 },
  medRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  medRowLow: { backgroundColor: '#FFF8F8' },
  medRowLeft: { flex: 1, marginRight: 12, gap: 4 },
  medRowNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  medRowWarningDot: { fontSize: 8, color: '#F44336' },
  medRowName: { fontSize: 15, fontWeight: '700', color: '#1A2B3C' },
  repeatBadge: { backgroundColor: '#E0F7FA', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  repeatBadgeText: { fontSize: 10, fontWeight: '700', color: '#00838F' },
  medRowDose: { fontSize: 12, color: '#7A8B9A' },
  medRowRight: { alignItems: 'flex-end', gap: 6 },
  setRepeatBtn: { backgroundColor: '#F0FBFC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#B2EBF2' },
  setRepeatBtnText: { fontSize: 11, fontWeight: '700', color: '#00838F' },
  countChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5F9FA', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#E8EFF3' },
  countChipLow: { backgroundColor: '#FFF0F0', borderColor: '#FFCDD2' },
  countChipText: { fontSize: 14, fontWeight: '600', color: '#1A2B3C' },
  countChipTextLow: { color: '#F44336' },
  countChipEdit: { fontSize: 12, color: '#B0BEC5' },
  editGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  adjustBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#E8EFF3', alignItems: 'center', justifyContent: 'center' },
  adjustBtnText: { fontSize: 18, color: '#1A2B3C', fontWeight: '600', lineHeight: 20 },
  countInput: { width: 52, height: 36, borderRadius: 8, borderWidth: 1.5, borderColor: '#00BCD4', textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#1A2B3C', backgroundColor: '#FFFFFF' },
  divider: { height: 1, backgroundColor: '#F0F4F7', marginHorizontal: 16 },

  // ── Reminder list ──
  reminderItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  reminderItemIcon: { fontSize: 20 },
  reminderItemName: { fontSize: 14, fontWeight: '700', color: '#1A2B3C' },
  reminderItemDate: { fontSize: 12, color: '#00BCD4', marginTop: 2, fontWeight: '600' },
  reminderClearBtn: { padding: 6 },
  reminderClearBtnText: { fontSize: 14, color: '#B0BEC5', fontWeight: '600' },

  // ── Empty ──
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#E8EFF3' },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 14, color: '#7A8B9A' },
});

const repeatStyles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F4F7', marginBottom: 16 },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: '#1A2B3C', flex: 1, marginRight: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#7A8B9A', letterSpacing: 1.1, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: '#F5F9FA', borderWidth: 1.5, borderColor: '#E8EFF3' },
  chipSelected: { backgroundColor: '#00BCD4', borderColor: '#00BCD4' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#7A8B9A' },
  chipTextSelected: { color: '#FFFFFF' },
  phoneInput: { backgroundColor: '#F5F9FA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A2B3C', borderWidth: 1, borderColor: '#E8EFF3', marginBottom: 20 },
  saveBtn: { backgroundColor: '#00BCD4', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

const requestStyles = StyleSheet.create({
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F5F9FA', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E8EFF3' },
  actionIcon: { fontSize: 26 },
  actionTitle: { fontSize: 15, fontWeight: '700', color: '#1A2B3C' },
  actionSub: { fontSize: 12, color: '#7A8B9A', marginTop: 2 },
  actionArrow: { fontSize: 22, color: '#B0BEC5', fontWeight: '300' },
  noPhoneHint: { backgroundColor: '#FFF8E1', borderRadius: 12, padding: 14, marginBottom: 10 },
  noPhoneText: { fontSize: 13, color: '#795548', lineHeight: 18 },
  markBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: '#E8F5E9', marginBottom: 8 },
  markBtnText: { fontSize: 15, fontWeight: '700', color: '#2E7D32' },
});

const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  sheet: { width: 320, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24 },
  title: { fontSize: 18, fontWeight: '800', color: '#1A2B3C', marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#7A8B9A', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 6, backgroundColor: '#F5F9FA' },
  optionRowSelected: { backgroundColor: '#E0F7FA' },
  optionText: { flex: 1, fontSize: 15, color: '#1A2B3C', fontWeight: '500' },
  optionTextSelected: { color: '#00838F', fontWeight: '700' },
  optionCheck: { fontSize: 16, color: '#00BCD4', fontWeight: '800' },
  clearBtn: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
  clearBtnText: { fontSize: 14, color: '#F44336', fontWeight: '600' },
  closeBtn: { marginTop: 4, paddingVertical: 12, alignItems: 'center', borderRadius: 12, backgroundColor: '#F5F9FA' },
  closeBtnText: { fontSize: 15, color: '#7A8B9A', fontWeight: '600' },
});
