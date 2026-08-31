import { Text } from 'react-native';

function MockIcon(props: any) {
  return <Text testID={props.testID}>{props.name}</Text>;
}

export const FontAwesome6 = MockIcon;
export const MaterialCommunityIcons = MockIcon;
export const Ionicons = MockIcon;
export const Feather = MockIcon;
export const FontAwesome = MockIcon;
export const MaterialIcons = MockIcon;
export const AntDesign = MockIcon;
export const Entypo = MockIcon;

export default MockIcon;
