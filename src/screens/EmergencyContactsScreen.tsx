import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { EmergencyContact } from '../types';

interface ContactFormState {
  name: string;
  phone: string;
}

interface ContactFormProps {
  initial: ContactFormState;
  onSave: (name: string, phone: string) => void;
  onCancel: () => void;
  title: string;
}

function ContactForm({ initial, onSave, onCancel, title }: ContactFormProps) {
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);

  const isValid = name.trim().length > 0 && phone.trim().length > 0;

  return (
    <View style={styles.formSheet}>
      <Text style={styles.formTitle}>{title}</Text>

      <Text style={styles.formLabel}>NAME</Text>
      <TextInput
        style={styles.formInput}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Jane Doe"
        placeholderTextColor="#B0BEC5"
        autoFocus
      />

      <Text style={styles.formLabel}>PHONE</Text>
      <TextInput
        style={styles.formInput}
        value={phone}
        onChangeText={setPhone}
        placeholder="e.g. +1 555 000 0000"
        placeholderTextColor="#B0BEC5"
        keyboardType="phone-pad"
      />

      <View style={styles.formBtns}>
        <TouchableOpacity style={styles.formCancelBtn} onPress={onCancel} activeOpacity={0.7}>
          <Text style={styles.formCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.formSaveBtn, !isValid && styles.formSaveBtnDisabled]}
          onPress={() => onSave(name.trim(), phone.trim())}
          disabled={!isValid}
          activeOpacity={0.85}
        >
          <Text style={styles.formSaveText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function EmergencyContactsScreen() {
  const { state, addContact, removeContact, updateContact } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [editContact, setEditContact] = useState<EmergencyContact | null>(null);

  const contacts = state.emergencyContacts ?? [];

  const handleAdd = useCallback(
    (name: string, phone: string) => {
      addContact(name, phone);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAdd(false);
    },
    [addContact]
  );

  const handleUpdate = useCallback(
    (name: string, phone: string) => {
      if (!editContact) return;
      updateContact({ ...editContact, name, phone });
      Haptics.selectionAsync();
      setEditContact(null);
    },
    [editContact, updateContact]
  );

  const handleDelete = useCallback(
    (contact: EmergencyContact) => {
      Alert.alert(
        'Remove Contact',
        `Remove ${contact.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              removeContact(contact.id);
              Haptics.selectionAsync();
            },
          },
        ]
      );
    },
    [removeContact]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerIcon}>🛡️</Text>
          <Text style={styles.infoBannerText}>
            If you miss a dose, we'll alert your contacts.
          </Text>
        </View>

        {/* Contacts section */}
        <Text style={styles.sectionLabel}>CONTACTS</Text>

        {contacts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No contacts added yet.</Text>
          </View>
        ) : (
          <View style={styles.contactsCard}>
            {contacts.map((c, idx) => (
              <View key={c.id}>
                <View style={styles.contactRow}>
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactAvatarEmoji}>👤</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{c.name}</Text>
                    <Text style={styles.contactPhone}>{c.phone}</Text>
                  </View>
                  <View style={styles.contactActions}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => setEditContact(c)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteContactBtn}
                      onPress={() => handleDelete(c)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.deleteContactBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {idx < contacts.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowAdd(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnText}>+ Add Contact</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>🔒 Your info is always private & secure.</Text>
      </ScrollView>

      {/* Add modal */}
      <Modal
        visible={showAdd}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAdd(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowAdd(false)}
        >
          <ContactForm
            title="Add Contact"
            initial={{ name: '', phone: '' }}
            onSave={handleAdd}
            onCancel={() => setShowAdd(false)}
          />
        </TouchableOpacity>
      </Modal>

      {/* Edit modal */}
      <Modal
        visible={editContact !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditContact(null)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setEditContact(null)}
        >
          {editContact && (
            <ContactForm
              title="Edit Contact"
              initial={{ name: editContact.name, phone: editContact.phone }}
              onSave={handleUpdate}
              onCancel={() => setEditContact(null)}
            />
          )}
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F9FA',
  },
  scroll: {
    padding: 20,
    paddingBottom: 48,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: '#B3D8F5',
  },
  infoBannerIcon: {
    fontSize: 22,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#1565C0',
    fontWeight: '500',
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7A8B9A',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8EFF3',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#7A8B9A',
  },
  contactsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EFF3',
    overflow: 'hidden',
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8EFF3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactAvatarEmoji: {
    fontSize: 20,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2B3C',
  },
  contactPhone: {
    fontSize: 13,
    color: '#7A8B9A',
    marginTop: 2,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00BCD4',
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00BCD4',
  },
  deleteContactBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteContactBtnText: {
    fontSize: 13,
    color: '#F44336',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F4F7',
    marginHorizontal: 14,
  },
  addBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#00BCD4',
    marginBottom: 24,
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00BCD4',
  },
  footer: {
    textAlign: 'center',
    fontSize: 13,
    color: '#7A8B9A',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  formSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2B3C',
    marginBottom: 20,
    textAlign: 'center',
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7A8B9A',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 16,
  },
  formInput: {
    backgroundColor: '#F5F9FA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#1A2B3C',
    borderWidth: 1,
    borderColor: '#E8EFF3',
  },
  formBtns: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  formCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8EFF3',
    alignItems: 'center',
  },
  formCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7A8B9A',
  },
  formSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#00BCD4',
    alignItems: 'center',
  },
  formSaveBtnDisabled: {
    backgroundColor: '#B0BEC5',
  },
  formSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
