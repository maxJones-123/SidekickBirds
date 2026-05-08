import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { lookupLocal } from '../data/medications';

export interface ScannedMedInfo {
  name: string;
  dose: string;
  form: string;
  funnyBirdName?: string;
  commonUse?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onScanned: (info: ScannedMedInfo) => void;
}

async function lookupMedication(barcode: string): Promise<ScannedMedInfo | null> {
  // Note: no open UK drug barcode API exists; this falls back to the US FDA
  // database which covers many international brand names. Results may be
  // limited for UK-only products — consider adding local caching.
  const queries = [
    `package_ndc:"${barcode}"`,
    `product_ndc:"${barcode}"`,
    `generic_name:"${barcode}"`,
  ];

  for (const q of queries) {
    try {
      const url = `https://api.fda.gov/drug/ndc.json?search=${encodeURIComponent(q)}&limit=1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const json = await res.json();
      const results = json?.results;
      if (!results || results.length === 0) continue;

      const r = results[0];
      // Extract useful fields
      const name: string =
        r.brand_name || r.generic_name || r.substance_name?.[0] || '';
      const dosage: string = r.dosage_form || '';
      const route: string = r.route?.[0] || '';
      const strength: string =
        r.active_ingredients?.[0]?.strength || '';

      if (!name) continue;

      return {
        name: capitalizeWords(name),
        dose: strength,
        form: dosage || route,
      };
    } catch {
      // network or parse error — try next query
    }
  }
  return null;
}

function capitalizeWords(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export default function BarcodeScannerModal({ visible, onClose, onScanned }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastCode, setLastCode] = useState('');

  // Reset state whenever the modal opens
  useEffect(() => {
    if (visible) {
      setScanned(false);
      setLoading(false);
      setLastCode('');
    }
  }, [visible]);

  const handleBarcode = useCallback(
    async (result: BarcodeScanningResult) => {
      if (scanned || loading) return;
      const code = result.data;
      if (code === lastCode) return;
      setLastCode(code);
      setScanned(true);
      setLoading(true);

      // Check local CSV database first (instant, offline)
      const local = lookupLocal(code);
      if (local) {
        setLoading(false);
        onScanned({
          name: local.name,
          dose: local.dose,
          form: local.form,
          funnyBirdName: local.funnyBirdName || undefined,
          commonUse: local.commonUse || undefined,
        });
        onClose();
        return;
      }

      // Fall back to remote API for anything not in local DB
      const info = await lookupMedication(code);
      setLoading(false);

      if (info) {
        onScanned(info);
        onClose();
      } else {
        Alert.alert(
          'Medication Not Found',
          `Barcode ${code} wasn't recognised. This may be a UK-only product — you can enter the details manually.`,
          [
            {
              text: 'Scan Again',
              onPress: () => {
                setScanned(false);
                setLastCode('');
              },
            },
            {
              text: 'Enter Manually',
              onPress: onClose,
            },
          ]
        );
      }
    },
    [scanned, loading, lastCode, onScanned, onClose]
  );

  if (!visible) return null;

  // No permission object yet — still loading
  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00BCD4" />
        </View>
      </Modal>
    );
  }

  // Permission not granted
  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.permissionScreen}>
          <Text style={styles.permissionEmoji}>📷</Text>
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionSub}>
            We need your camera to scan medication barcodes.
          </Text>
          <TouchableOpacity
            style={styles.permissionBtn}
            onPress={requestPermission}
            activeOpacity={0.85}
          >
            <Text style={styles.permissionBtnText}>Grant Access</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeLink} onPress={onClose}>
            <Text style={styles.closeLinkText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: [
              'qr',
              'ean13',
              'ean8',
              'upc_a',
              'upc_e',
              'code128',
              'code39',
              'pdf417',
              'datamatrix',
              'itf14',
            ],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarcode}
        />

        {/* Dark overlay with scan window */}
        <View style={styles.overlay}>
          {/* Top dark region */}
          <View style={styles.overlayTop} />

          {/* Middle row: side bars + scan box */}
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.scanBox}>
              {/* Corner markers */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />

              {loading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.loadingText}>Looking up medication…</Text>
                </View>
              )}
            </View>
            <View style={styles.overlaySide} />
          </View>

          {/* Bottom dark region */}
          <View style={styles.overlayBottom}>
            <Text style={styles.scanHint}>
              Point the camera at your medication barcode
            </Text>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const SCAN_BOX = 260;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  permissionScreen: {
    flex: 1,
    backgroundColor: '#F5F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A2B3C',
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionSub: {
    fontSize: 15,
    color: '#7A8B9A',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionBtn: {
    backgroundColor: '#00BCD4',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  permissionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeLink: {
    marginTop: 20,
  },
  closeLinkText: {
    fontSize: 15,
    color: '#7A8B9A',
    fontWeight: '600',
  },
  // Overlay layout
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: SCAN_BOX,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  scanBox: {
    width: SCAN_BOX,
    height: SCAN_BOX,
    backgroundColor: 'transparent',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  scanHint: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 24,
    opacity: 0.9,
  },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 36,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // Corner markers
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#00BCD4',
    borderWidth: 3,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
