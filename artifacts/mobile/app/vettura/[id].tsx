import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useApiQuery } from "@/hooks/useApi";

interface Vettura {
  id: number;
  marca: string;
  modello: string;
  anno: number;
  targa: string;
  carburante: string;
  stato: string;
  colore: string | null;
  prezzo: number | null;
  km: number | null;
  disponibile: boolean;
  note: string | null;
}

function InfoRow({ label, value, colors }: { label: string; value: string | null; colors: ReturnType<typeof useColors> }) {
  if (!value) return null;
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 }}>
      <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>{label}</Text>
      <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground, maxWidth: "60%", textAlign: "right" }}>{value}</Text>
    </View>
  );
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 2 }}>
      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>{title}</Text>
      {children}
    </View>
  );
}

export default function VetturaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();

  const { data, isLoading, isError, refetch } = useApiQuery<Vettura>(
    ["vettura", id],
    `/vetture/${id}`,
    { enabled: !!id }
  );

  const topPad = Platform.OS === "web" ? 67 : 0;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
    scrollContent: {
      paddingTop: topPad + 16,
      paddingHorizontal: 16,
      paddingBottom: 40,
      gap: 12,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    title: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      flex: 1,
    },
    badge: {
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    badgeText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 4,
    },
    retryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    retryBtnText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.primaryForeground,
    },
    errorText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
  });

  if (isLoading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (isError || !data) {
    return (
      <View style={[styles.container, styles.center]}>
        <Feather name="alert-circle" size={36} color={colors.mutedForeground} />
        <Text style={styles.errorText}>Vettura non trovata</Text>
        <Pressable style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryBtnText}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  const disponibileColor = data.disponibile ? colors.success : colors.warning;
  const disponibileLabel = data.disponibile ? "Disponibile" : "Non disponibile";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{data.marca} {data.modello}</Text>
        <View style={[styles.badge, { backgroundColor: disponibileColor + "22" }]}>
          <Text style={[styles.badgeText, { color: disponibileColor }]}>{disponibileLabel}</Text>
        </View>
      </View>

      <Section title="Informazioni" colors={colors}>
        <InfoRow label="Targa" value={data.targa} colors={colors} />
        <View style={styles.divider} />
        <InfoRow label="Anno" value={String(data.anno)} colors={colors} />
        <View style={styles.divider} />
        <InfoRow label="Carburante" value={data.carburante} colors={colors} />
        <View style={styles.divider} />
        <InfoRow label="Stato" value={data.stato} colors={colors} />
        {data.colore && <><View style={styles.divider} /><InfoRow label="Colore" value={data.colore} colors={colors} /></>}
        {data.km != null && <><View style={styles.divider} /><InfoRow label="Chilometri" value={data.km.toLocaleString("it-IT") + " km"} colors={colors} /></>}
        {data.prezzo != null && <><View style={styles.divider} /><InfoRow label="Prezzo" value={`€${data.prezzo.toLocaleString("it-IT")}`} colors={colors} /></>}
      </Section>

      {data.note && (
        <Section title="Note" colors={colors}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.foreground }}>{data.note}</Text>
        </Section>
      )}
    </ScrollView>
  );
}
