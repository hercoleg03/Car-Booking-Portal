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
  targa: string;
  carburante: string;
}

interface Manutenzione {
  id: number;
  vetturaId: number;
  tipo: string;
  data: string;
  costo: number | null;
  descrizione: string | null;
  prossimaManutenzione: string | null;
  note: string | null;
  vettura: Vettura | null;
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getStatus(data: string): { label: string; bg: string; text: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(data + "T00:00:00");
  if (d < today) return { label: "Completata", bg: "#6b728022", text: "#6b7280" };
  if (d.getTime() === today.getTime()) return { label: "Oggi", bg: "#3b82f622", text: "#3b82f6" };
  return { label: "Pianificata", bg: "#f59e0b22", text: "#f59e0b" };
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

export default function ManutenzioneDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();

  const { data, isLoading, isError, refetch } = useApiQuery<Manutenzione>(
    ["manutenzione", id],
    `/manutenzioni/${id}`,
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
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
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
        <Text style={styles.errorText}>Manutenzione non trovata</Text>
        <Pressable style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryBtnText}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  const status = getStatus(data.data);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{data.tipo}</Text>
        <View style={[styles.badge, { backgroundColor: status.bg }]}>
          <Text style={[styles.badgeText, { color: status.text }]}>{status.label}</Text>
        </View>
      </View>

      <Section title="Dettagli" colors={colors}>
        <InfoRow label="Data" value={formatDate(data.data)} colors={colors} />
        <View style={styles.divider} />
        <InfoRow label="Tipo" value={data.tipo} colors={colors} />
        {data.costo != null && <><View style={styles.divider} /><InfoRow label="Costo" value={`€${data.costo.toLocaleString("it-IT")}`} colors={colors} /></>}
        {data.prossimaManutenzione && <><View style={styles.divider} /><InfoRow label="Prossima" value={formatDate(data.prossimaManutenzione)} colors={colors} /></>}
      </Section>

      {data.vettura && (
        <Section title="Vettura" colors={colors}>
          <InfoRow label="Modello" value={`${data.vettura.marca} ${data.vettura.modello}`} colors={colors} />
          <View style={styles.divider} />
          <InfoRow label="Targa" value={data.vettura.targa} colors={colors} />
          <View style={styles.divider} />
          <InfoRow label="Carburante" value={data.vettura.carburante} colors={colors} />
        </Section>
      )}

      {data.descrizione && (
        <Section title="Descrizione" colors={colors}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 20 }}>{data.descrizione}</Text>
        </Section>
      )}

      {data.note && (
        <Section title="Note" colors={colors}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.foreground }}>{data.note}</Text>
        </Section>
      )}
    </ScrollView>
  );
}
