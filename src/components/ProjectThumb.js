import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';

// رسم توضيحي مبسّط لكل نوع مشروع بألوان التصميم
export default function ProjectThumb({ type = 'government', width = '100%', height = 120, radius = 14 }) {
  return (
    <View style={{ width, height, borderRadius: radius, overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox="0 0 300 160" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#2b3220" />
            <Stop offset="1" stopColor="#3d472b" />
          </LinearGradient>
          <LinearGradient id="bld" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#8fa073" />
            <Stop offset="1" stopColor="#3d472b" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="300" height="160" fill="url(#sky)" />
        {renderScene(type)}
      </Svg>
    </View>
  );
}

function renderScene(type) {
  const win = '#eee7db';
  const acc = '#c67139';
  switch (type) {
    case 'residential':
      return (<>
        <Rect x="60" y="40" width="70" height="110" fill="url(#bld)" />
        <Rect x="150" y="20" width="60" height="130" fill="url(#bld)" />
        {grid(65, 48, 3, 6, win)}{grid(155, 28, 2, 7, win)}
      </>);
    case 'commercial':
      return (<>
        <Rect x="90" y="15" width="120" height="135" fill="url(#bld)" />
        {grid(98, 25, 5, 8, win)}
        <Rect x="90" y="15" width="120" height="6" fill={acc} />
      </>);
    case 'hotel':
      return (<>
        <Rect x="70" y="35" width="160" height="115" fill="url(#bld)" />
        {grid(80, 45, 7, 6, win)}
        <Rect x="130" y="120" width="40" height="30" fill="#2b3220" />
      </>);
    case 'industrial':
      return (<>
        <Path d="M40 90 L100 90 L100 150 L40 150 Z" fill="url(#bld)" />
        <Path d="M40 90 L70 70 L100 90 Z" fill="#8fa073" />
        <Path d="M110 90 L170 90 L170 150 L110 150 Z" fill="url(#bld)" />
        <Path d="M110 90 L140 70 L170 90 Z" fill="#8fa073" />
        <Rect x="220" y="30" width="10" height="120" fill={acc} />
      </>);
    case 'road':
      return (<>
        <Path d="M0 150 L120 60 L180 60 L60 150 Z" fill="#8fa073" />
        <Path d="M300 150 L180 60 L120 60 L240 150 Z" fill="#7a8a5e" />
        <Line x1="150" y1="60" x2="150" y2="150" stroke={acc} strokeWidth="3" strokeDasharray="8 8" />
      </>);
    case 'government':
    default:
      return (<>
        <Rect x="55" y="70" width="190" height="80" fill="url(#bld)" />
        <Path d="M45 70 L150 30 L255 70 Z" fill="#8fa073" />
        {[70, 105, 140, 175, 210].map((x) => (<Rect key={x} x={x} y="80" width="16" height="70" fill="#2b3220" />))}
        <Circle cx="150" cy="52" r="6" fill={acc} />
      </>);
  }
}

function grid(x0, y0, cols, rows, fill) {
  const cells = []; const gap = 10;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
    cells.push(<Rect key={`${r}-${c}`} x={x0 + c * gap} y={y0 + r * 12} width="6" height="7" fill={fill} opacity={0.85} />);
  return cells;
}
