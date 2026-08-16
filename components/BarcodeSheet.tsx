import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '../constants/theme';

/**
 * Barcode scanning is a shortcut, never a requirement: the code is only used to
 * recognise a product this store has received before. Nothing is looked up
 * online, so an unknown code simply means typing the name once.
 */
export function BarcodeSheet({
  visible,
  onClose,
  onScanned,
}: {
  visible: boolean;
  onClose: () => void;
  onScanned: (barcode: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  if (!visible) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-ink">
        {permission?.granted ? (
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'itf14'],
            }}
            onBarcodeScanned={({ data }) => {
              if (handled.current) return;
              handled.current = true;
              onScanned(data);
              setTimeout(() => {
                handled.current = false;
              }, 1200);
            }}
          />
        ) : (
          <SafeAreaView className="flex-1 items-center justify-center px-8">
            <Text className="text-center font-display text-lg text-card">Camera access needed</Text>
            <Text className="mt-2 text-center font-body text-sm" style={{ color: palette.line }}>
              Scanning matches a barcode to a product you've received before. You can always type the
              name instead.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={requestPermission}
              className="mt-5 rounded-lg bg-card px-4 py-3"
            >
              <Text className="font-semibold text-sm text-ink">Allow camera</Text>
            </Pressable>
          </SafeAreaView>
        )}

        <SafeAreaView edges={['bottom']} className="absolute inset-x-0 bottom-0">
          <View className="items-center px-6 pb-4">
            <Text className="mb-3 text-center font-body text-sm" style={{ color: palette.line }}>
              Point the camera at the barcode
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              className="rounded-lg bg-card px-5 py-3"
            >
              <Text className="font-semibold text-sm text-ink">Close</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
