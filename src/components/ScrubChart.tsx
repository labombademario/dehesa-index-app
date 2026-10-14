import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { C } from '../lib/theme';
import { numAuto, date } from '../lib/format';
import type { Lang } from '../lib/types';

type Pts = [string, number][];

const LEFT = 46;      // hueco del eje de precios
const RIGHT = 12;
const TOP = 46;       // banda superior reservada para la burbuja con fecha y precio
const BOTTOM = 24;    // hueco del eje de fechas

// Fecha de los ejes: «ago 2023» (mes y año) cuando el dato trae día; los periodos sueltos tal cual
function axisDate(s: string, L: Lang): string {
  const m = /^(\d{4}-\d{2})-\d{2}$/.exec(s);
  if (m) return date(m[1], L);
  return /^\d{4}-\d{2}$/.test(s) ? date(s, L) : s;
}
// Fecha del cursor: con día completo
function tipDate(s: string, L: Lang): string {
  return /^\d{4}-\d{2}(-\d{2})?$/.test(s) ? date(s, L) : s;
}

/** Gráfico de línea con ejes (precio a la izquierda, fechas abajo) y cursor táctil: al pasar el dedo
 *  se ve la fecha y el precio del punto más cercano, dentro del propio gráfico. */
export function ScrubChart({ points, width, height = 240, unit, label, L }: { points: Pts; width: number; height?: number; unit: string; label: string; L: Lang }) {
  const n = points.length;
  const [idx, setIdx] = useState<number | null>(null);
  const [tipW, setTipW] = useState(120);
  const g = useMemo(() => {
    const vals = points.map(p => p[1]);
    const mn = Math.min(...vals), mx = Math.max(...vals), rg = mx - mn || 1;
    const pw = width - LEFT - RIGHT, ph = height - TOP - BOTTOM;
    const x = (i: number) => LEFT + (n > 1 ? i * pw / (n - 1) : 0);
    const y = (v: number) => TOP + (1 - (v - mn) / rg) * ph;
    const d = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    return { vals, mn, mx, pw, ph, x, y, d };
  }, [points, width, height]);
  // el responder lee siempre la geometría actual
  const geo = useRef(g); geo.current = g;
  const nRef = useRef(n); nRef.current = n;
  const pick = (px: number) => {
    const G = geo.current, N = nRef.current;
    const i = Math.round((px - LEFT) / (G.pw / (N - 1)));
    setIdx(Math.max(0, Math.min(N - 1, i)));
  };
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,   // que la pantalla no se desplace mientras se mira el gráfico
    onPanResponderGrant: e => pick(e.nativeEvent.locationX),
    onPanResponderMove: e => pick(e.nativeEvent.locationX),
    onPanResponderRelease: () => setIdx(null),
    onPanResponderTerminate: () => setIdx(null),
  }), []);

  const ticks = [g.mx, (g.mx + g.mn) / 2, g.mn];
  const mid = Math.floor((n - 1) / 2);
  const sel = idx != null ? Math.min(idx, n - 1) : null;
  const cx = sel != null ? g.x(sel) : 0, cy = sel != null ? g.y(g.vals[sel]) : 0;
  const tipLeft = Math.max(LEFT, Math.min(width - RIGHT - tipW, cx - tipW / 2));

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width, height }} {...pan.panHandlers}>
      <Svg width={width} height={height} pointerEvents="none">
        {ticks.map((v, i) => {
          const yy = g.y(v);
          return <React.Fragment key={i}>
            <Line x1={LEFT} y1={yy} x2={width - RIGHT} y2={yy} stroke={C.border} strokeWidth={1} strokeDasharray={i === 2 ? undefined : '3,4'} />
            <SvgText x={LEFT - 6} y={yy + 4} fontSize={11} fill={C.textMuted} textAnchor="end">{numAuto(v, L)}</SvgText>
          </React.Fragment>;
        })}
        <Line x1={LEFT} y1={TOP} x2={LEFT} y2={height - BOTTOM} stroke={C.border} strokeWidth={1} />
        {[0, mid, n - 1].map((i, k) => (
          <React.Fragment key={k}>
            <Line x1={g.x(i)} y1={height - BOTTOM} x2={g.x(i)} y2={height - BOTTOM + 4} stroke={C.border} strokeWidth={1} />
            <SvgText x={g.x(i)} y={height - 6} fontSize={11} fill={C.textMuted} textAnchor={k === 0 ? 'start' : k === 2 ? 'end' : 'middle'}>{axisDate(points[i][0], L)}</SvgText>
          </React.Fragment>
        ))}
        <Path d={g.d} stroke={C.accent} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {sel == null ? <Circle cx={g.x(n - 1)} cy={g.y(g.vals[n - 1])} r={4.5} fill={C.accent} /> : <>
          <Line x1={cx} y1={TOP} x2={cx} y2={height - BOTTOM} stroke={C.textMuted} strokeWidth={1} strokeDasharray="4,3" />
          <Line x1={LEFT} y1={cy} x2={cx} y2={cy} stroke={C.textMuted} strokeWidth={1} strokeDasharray="4,3" />
          <Circle cx={cx} cy={cy} r={6} fill={C.surface} stroke={C.accent} strokeWidth={3} />
        </>}
      </Svg>
      {sel != null ? (
        <View pointerEvents="none" onLayout={e => setTipW(e.nativeEvent.layout.width)}
          style={{ position: 'absolute', top: 0, left: tipLeft, backgroundColor: C.text, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 }}>
          <Text style={{ color: C.bg, fontSize: 12, fontVariant: ['tabular-nums'] }}>{tipDate(points[sel][0], L)}</Text>
          <Text style={{ color: C.bg, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{numAuto(g.vals[sel], L)} {unit}</Text>
        </View>
      ) : null}
    </View>
  );
}
