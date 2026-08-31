import { View } from 'react-native';

export function createIcon() {
  return function Icon(props: any) {
    return <View testID={props.testID} />;
  };
}

export const Car = createIcon();
export const ArrowLeft = createIcon();
export const Calendar = createIcon();
export const ArrowUpRight = createIcon();
export const CarFront = createIcon();
export const ChevronDown = createIcon();
export const ChevronLeft = createIcon();
export const ChevronRight = createIcon();
export const ChevronUp = createIcon();
export const Clock = createIcon();
export const Coins = createIcon();
export const BriefcaseBusiness = createIcon();
export const CircleDollarSign = createIcon();
export const CircleUserRound = createIcon();
export const CreditCard = createIcon();
export const Database = createIcon();
export const UserRound = createIcon();
export const Gamepad2 = createIcon();
export const Gift = createIcon();
export const Eye = createIcon();
export const EyeOff = createIcon();
export const Bell = createIcon();
export const CalendarDays = createIcon();
export const HeartPulse = createIcon();
export const House = createIcon();
export const LayoutDashboard = createIcon();
export const LayoutGrid = createIcon();
export const List = createIcon();
export const ListChecks = createIcon();
export const MoreHorizontal = createIcon();
export const Plus = createIcon();
export const Repeat = createIcon();
export const Check = createIcon();
export const ReceiptText = createIcon();
export const ShoppingBag = createIcon();
export const Target = createIcon();
export const Utensils = createIcon();
export const UserCircle = createIcon();
export const WalletCards = createIcon();
export const X = createIcon();
export const Pencil = createIcon();
export const Trash2 = createIcon();
export const Shapes = createIcon();
export const Search = createIcon();
export const SlidersHorizontal = createIcon();
export const RotateCcw = createIcon();
export const Sliders = createIcon();
export const Filter = createIcon();

const icons: Record<string, any> = {
  Car,
  ArrowLeft,
  Calendar,
  ArrowUpRight,
  CarFront,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Coins,
  BriefcaseBusiness,
  CircleDollarSign,
  CircleUserRound,
  CreditCard,
  Database,
  UserRound,
  Gamepad2,
  Gift,
  Eye,
  EyeOff,
  Bell,
  CalendarDays,
  HeartPulse,
  House,
  LayoutDashboard,
  LayoutGrid,
  List,
  ListChecks,
  MoreHorizontal,
  Plus,
  Repeat,
  Check,
  ReceiptText,
  ShoppingBag,
  Target,
  Utensils,
  UserCircle,
  WalletCards,
  X,
  Pencil,
  Trash2,
  Shapes,
  Search,
};

export default new Proxy(icons, {
  get(target, prop: string) {
    if (!(prop in target)) {
      target[prop] = createIcon();
    }
    return target[prop];
  },
});
