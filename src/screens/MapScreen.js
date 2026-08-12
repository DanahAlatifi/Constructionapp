import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { T, H, Icon } from '../components';
import { colors, radius, fonts, makeStyles, useThemeRedraw} from '../theme';
import { getProjectLocations } from '../api/services';
import { useAsync } from '../api/useAsync';
import { useProject } from '../ProjectContext';

// حساب المسافة بين نقطتين (كم) — معادلة Haversine
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapScreen({ navigation }) {
  useThemeRedraw();
  const { data: locations, loading, reload } = useAsync(() => getProjectLocations(), [], []);
  const { projects, setPid } = useProject();
  const [userLoc, setUserLoc] = useState(null);

  // اطلب موقع المستخدم الحالي
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLoc({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        }
      } catch (e) {}
    })();
  }, []);

  // عند الضغط على "فتح الموقع في الخرائط" → افتح Google Maps
  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data && data.openMaps && data.lat != null && data.lng != null) {
        // رابط Google Maps للاتجاهات من موقعك إلى المشروع
        const url = `https://www.google.com/maps/dir/?api=1&destination=${data.lat},${data.lng}`;
        Linking.openURL(url).catch(() => {
          // بديل: فتح الموقع فقط
          Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${data.lat},${data.lng}`);
        });
      }
    } catch (e) {}
  };

  // ابنِ HTML الخريطة (Leaflet + OpenStreetMap)
  const buildHtml = (points) => {
    const markers = (points || []).map((p) => {
      // احسب المسافة من موقع المستخدم إن توفّر
      let distText = '';
      if (userLoc) {
        const d = distanceKm(userLoc.latitude, userLoc.longitude, p.latitude, p.longitude);
        const dStr = d < 1 ? `${Math.round(d * 1000)} م` : `${d.toFixed(1)} كم`;
        distText = `<div style="color:#1e4b8f;font-size:12px;margin-top:2px">📍 يبعد ${dStr} عن موقعك</div>`;
      }
      return `L.marker([${p.latitude}, ${p.longitude}]).addTo(map)
        .bindPopup(${JSON.stringify(
          `<div style="text-align:right;direction:rtl;min-width:150px">
             <b>${p.name}</b><br>
             <span style="color:#666;font-size:12px">${p.customer || ''}</span>
             ${distText}
             <button onclick="openInMaps(${p.latitude}, ${p.longitude})"
               style="margin-top:8px;width:100%;background:#1e4b8f;color:#fff;border:none;border-radius:8px;padding:8px;font-size:13px;cursor:pointer">
               🗺️ فتح الموقع في الخرائط
             </button>
           </div>`
        )});`;
    }).join('\n');

    // علامة موقع المستخدم
    const userMarker = userLoc
      ? `var userIcon = L.divIcon({html:'<div style="width:18px;height:18px;background:#4285F4;border:3px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(66,133,244,0.6)"></div>',className:'',iconSize:[18,18],iconAnchor:[9,9]});
         L.marker([${userLoc.latitude}, ${userLoc.longitude}], {icon:userIcon}).addTo(map).bindPopup('موقعك الحالي');`
      : '';

    // مركز الخريطة: موقع المستخدم إن وُجد، وإلا أول مشروع
    const center = userLoc
      ? `[${userLoc.latitude}, ${userLoc.longitude}]`
      : (points && points.length ? `[${points[0].latitude}, ${points[0].longitude}]` : '[24.7136, 46.6753]');
    const zoom = 11;

    // كل النقاط (للحدود) — تشمل المستخدم
    const allPts = [
      ...(points || []).map((p) => [p.latitude, p.longitude]),
      ...(userLoc ? [[userLoc.latitude, userLoc.longitude]] : []),
    ];

    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .leaflet-popup-content { font-family: sans-serif; direction: rtl; text-align: right; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    function openInMaps(lat, lng) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ openMaps: true, lat: lat, lng: lng }));
      }
    }
    var map = L.map('map').setView(${center}, ${zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19
    }).addTo(map);
    ${userMarker}
    ${markers}
    var pts = ${JSON.stringify(allPts)};
    if (pts.length > 1) { map.fitBounds(pts, { padding: [50, 50] }); }
  </script>
</body>
</html>`;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <H style={styles.title}>خريطة المشاريع</H>
        <TouchableOpacity style={styles.refreshBtn} onPress={reload}>
          <Icon name="refresh-cw" size={16} color={colors.accent2_800} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent2_800} />
          <T style={styles.hint}>جارٍ تحميل المواقع…</T>
        </View>
      ) : (!locations || locations.length === 0) ? (
        <View style={styles.center}>
          <Icon name="map-pin" size={34} color={colors.neutral400} />
          <T style={styles.hint}>لا توجد مشاريع لها موقع محدّد على الخريطة</T>
          <T style={styles.hintSub}>حدّد موقع البناء لكل مشروع في Odoo لعرضه هنا</T>
        </View>
      ) : (
        <>
          <View style={styles.countBar}>
            <Icon name="map-pin" size={14} color={colors.accent2_800} />
            <T style={styles.countText}>{locations.length} مشروع على الخريطة</T>
          </View>
          <WebView
            key={userLoc ? 'with-loc' : 'no-loc'}
            style={styles.map}
            originWhitelist={['*']}
            source={{ html: buildHtml(locations) }}
            javaScriptEnabled
            domStorageEnabled
            onMessage={onMessage}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = makeStyles(() => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontSize: 22, flex: 1 },
  refreshBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent2_100, alignItems: 'center', justifyContent: 'center' },
  countBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.accent2_100, paddingVertical: 10, paddingHorizontal: 20 },
  countText: { fontSize: 13, color: colors.accent2_800, textAlign: 'right' },
  map: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  hint: { fontSize: 14, color: colors.neutral700, textAlign: 'center', marginTop: 6 },
  hintSub: { fontSize: 12.5, color: colors.neutral500, textAlign: 'center' },
}));
