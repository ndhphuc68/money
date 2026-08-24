import * as Sharing from 'expo-sharing';

export class SystemShare {
  async shareFile(uri: string): Promise<void> {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('System sharing is unavailable');
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      UTI: 'public.json',
    });
  }
}
