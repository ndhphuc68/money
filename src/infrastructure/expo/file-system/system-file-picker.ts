import * as DocumentPicker from 'expo-document-picker';

export class SystemFilePicker {
  async pickSyncPackage(): Promise<string | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
      multiple: false,
    });

    return result.canceled ? null : result.assets[0]?.uri ?? null;
  }
}
