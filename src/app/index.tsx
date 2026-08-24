import { StyleSheet, Text, View } from 'react-native';

export default function RootScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Offline First Sync</Text>
      <Text>Expo foundation ready.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
});
