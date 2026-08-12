import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing, Platform, I18nManager } from 'react-native';
import { BlurView } from 'expo-blur';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon, T } from './components';
import { colors, radius, shadow, fonts, makeStyles, onThemeChange } from './theme';
import { ProjectProvider } from './ProjectContext';

import { WelcomeScreen, ScanScreen, LoginScreen } from './screens/AuthScreens';
import PickProjectScreen from './screens/PickProjectScreen';
import DashboardScreen from './screens/DashboardScreen';
import VariationOrdersScreen from './screens/VariationOrdersScreen';
import BoqScreen from './screens/BoqScreen';
import PurchaseOrdersScreen from './screens/PurchaseOrdersScreen';
import SearchScreen from './screens/SearchScreen';
import HomeScreen from './screens/HomeScreen';
import ClaimsScreen from './screens/ClaimsScreen';
import SiteScreen from './screens/SiteScreen';
import MoreScreen from './screens/MoreScreen';
import MapScreen from './screens/MapScreen';
import ProfileScreen from './screens/ProfileScreen';
import {
  AllProjectsScreen, ProjectDetailsScreen, SubcontractorsScreen,
  GuaranteesScreen, DocumentsScreen, ShareScreen,
  AddGuaranteeScreen, NotificationsScreen,
} from './screens/DetailScreens';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TABS = {
  HomeTab: { icon: 'home', label: 'الرئيسية' },
  ClaimsTab: { icon: 'file-text', label: 'مستخلص' },
  SiteTab: { icon: 'map-pin', label: 'الموقع' },
  MapTab: { icon: 'map', label: 'الخريطة' },
  MoreTab: { icon: 'grid', label: 'المزيد' },
};

// شريط تبويبات pill عائم مطابق للتصميم
function FloatingTabBar({ state, navigation }) {
  const [, redraw] = useState(0);

  // أعد رسم الشريط عند تغيّر لون الشركة
  useEffect(() => {
    const off = onThemeChange(() => redraw((v) => v + 1));
    return off;
  }, []);

  return (
    <View style={styles.tabWrap} pointerEvents="box-none">
      <View style={styles.tabBar}>
        {/* الخلفية الزجاجية الشفافة */}
        <BlurView intensity={70} tint="light" style={styles.blur} />
        <View style={styles.tabTint} />

        {/* التابات */}
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { icon } = TABS[route.name];
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              onPress={onPress}
              activeOpacity={0.7}
            >
              <Icon name={icon} size={22} color={focused ? colors.accent2_800 : colors.accent2_400} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="ClaimsTab" component={ClaimsScreen} />
      <Tab.Screen name="SiteTab" component={SiteScreen} />
      <Tab.Screen name="MapTab" component={MapScreen} />
      <Tab.Screen name="MoreTab" component={MoreScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <ProjectProvider>
      <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false, gestureEnabled: true, fullScreenGestureEnabled: true, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Scan" component={ScanScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="PickProject" component={PickProjectScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="ProjectDetails" component={ProjectDetailsScreen} />
        <Stack.Screen name="AllProjects" component={AllProjectsScreen} />
        <Stack.Screen name="Subcontractors" component={SubcontractorsScreen} />
        <Stack.Screen name="Guarantees" component={GuaranteesScreen} />
        <Stack.Screen name="Documents" component={DocumentsScreen} />
        <Stack.Screen name="Share" component={ShareScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="AddGuarantee" component={AddGuaranteeScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="VariationOrders" component={VariationOrdersScreen} />
        <Stack.Screen name="Boq" component={BoqScreen} />
        <Stack.Screen name="PurchaseOrders" component={PurchaseOrdersScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
      </Stack.Navigator>
    </ProjectProvider>
  );
}

const styles = makeStyles(() => ({
  tabWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: 34, paddingHorizontal: 18 },
  tabBar: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.pill, padding: 8, width: '100%', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', ...shadow.lg },
  blur: { ...StyleSheet.absoluteFillObject },
  tabTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.12)' },
  indicator: { position: 'absolute', top: 8, bottom: 8, marginHorizontal: 3, borderRadius: radius.pill, backgroundColor: colors.accent2_800 },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.pill },
  tabLabel: { fontSize: 12, color: colors.white },
}));
