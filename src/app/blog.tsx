// Blog (como blog.html de la web): notas cortas con cifras y fuentes verificables. Las notas son las de js/blog.js, publicadas como data/blog/posts.json.
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useApp } from '../lib/store';
import { Screen, Card, Note } from '../components/ui';
import { C } from '../lib/theme';
import { webJson } from '../lib/fv';

type Post = { category: string; dateLabel: string; title: string; paras: string[]; sources: { label: string; url: string }[] };
type Doc = { langs: Record<string, { h1: string; sub: string; updated: string; disclaimer: string; posts: Post[] }> };

export default function Blog() {
  const { user, t } = useApp();
  const L = user.lang;
  const [doc, setDoc] = useState<Doc | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => { webJson('data/blog/posts.json', 6 * 3600e3).then((d: Doc | null) => { setDoc(d); setDone(true); }); }, []);
  const b = doc?.langs?.[L] ?? doc?.langs?.es;
  return (
    <Screen>
      <Stack.Screen options={{ title: b?.h1 ?? 'Blog' }} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: C.text }} accessibilityRole="header">{b?.h1 ?? 'Blog'}</Text>
      {!done ? <Note>{t('loading')}</Note> : !b ? <Note>{t('missing')}</Note> : <>
        <Text style={{ fontSize: 14, lineHeight: 21, color: C.textSoft }}>{b.sub}</Text>
        <Text style={{ fontSize: 12, color: C.textMuted }}>{b.updated}</Text>
        {b.posts.map(p => (
          <Card key={p.title}>
            <View style={{ padding: 16, gap: 8 }}>
              <Text style={{ fontSize: 12, color: C.textMuted }}>{p.category} · {p.dateLabel}</Text>
              <Text style={{ fontSize: 19, lineHeight: 25, fontWeight: '700', color: C.text }} accessibilityRole="header">{p.title}</Text>
              {p.paras.map((x, k) => <Text key={k} style={{ fontSize: 15, lineHeight: 23, color: C.text }}>{x}</Text>)}
              <View style={{ gap: 4 }}>
                {p.sources.map(s => <Pressable key={s.url} onPress={() => Linking.openURL(s.url)} accessibilityRole="link"><Text style={{ fontSize: 13, color: C.accent }}>{s.label} ↗</Text></Pressable>)}
              </View>
            </View>
          </Card>
        ))}
        <Text style={{ fontSize: 12, color: C.textMuted }}>{b.disclaimer}</Text>
      </>}
    </Screen>
  );
}
