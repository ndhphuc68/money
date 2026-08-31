import React from 'react';
import { Pressable, Text } from 'react-native';

/**
 * Lightweight Jest replacement for `@react-native-community/datetimepicker`.
 * The real component renders a native view that jsdom/react-test-renderer
 * cannot host; this stub exposes the same `value`/`onChange` contract so
 * components can be exercised without a native module.
 */
type DateTimePickerProps = {
  value: Date;
  mode?: 'date' | 'time' | 'datetime';
  onChange?: (event: { type: string }, date?: Date) => void;
  testID?: string;
};

export default function DateTimePicker({
  value,
  onChange,
  testID = 'native-date-picker',
}: DateTimePickerProps) {
  return (
    <Pressable
      accessibilityLabel={testID}
      onPress={() => onChange?.({ type: 'set' }, value)}
      testID={testID}>
      <Text>{value.toISOString()}</Text>
    </Pressable>
  );
}
