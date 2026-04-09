import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useApiQuery } from "@/hooks/useApi";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface DashboardStats {
  totaleVetture: number;
  vettureDisponibili: number;
  vetturePrenotate: number;
  totaleClienti: number;
  prenotazioniAttive: number;
  prenotazioniMese: number;
  vettureInRientroOggi: number;
  prenotazioniInizioOggi: number;
}

function KpiCard({
  label,
  value,
  icon,
  color,
  colors,
}: {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[kpiStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[kpiStyles.iconWrap, { backgroundColor: color + "22" }]}>
        <Feather name={icon as never} size={20} color={color} />
      </View>
      <Text style={[kpiStyles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[kpiStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const kpiStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    minWidth: "45%",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch, isFetching } = useApiQuery<DashboardStats>(
    ["dashboard-stats"],
    "/dashboard/stats"
  );

  const topPad = Platform.OS === "web" ? 67 : 0;
  const bottomPad = Platform.OS === "web" ? 84 : 0;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingTop: topPad + 20,
      paddingBottom: bottomPad + 20,
      paddingHorizontal: 16,
      gap: 16,
    },
    header: {
      marginBottom: 4,
    },
    headerTitle: {
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    headerSub: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 2,
    },
    sectionTitle: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    row: {
      flexDirection: "row",
      gap: 12,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 12,
      paddingTop: 80,
    },
    errorText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
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
    todayCard: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      gap: 12,
    },
    todayTitle: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.primaryForeground,
      opacity: 0.85,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    todayRow: {
      flexDirection: "row",
      gap: 16,
    },
    todayItem: {
      flex: 1,
      gap: 4,
    },
    todayValue: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: colors.primaryForeground,
    },
    todayLabel: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.primaryForeground,
      opacity: 0.8,
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[styles.container, styles.center]}>
        <Feather name="wifi-off" size={40} color={colors.mutedForeground} />
        <Text style={styles.errorText}>Impossibile caricare i dati</Text>
        <Pressable style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryBtnText}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  const today = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSub}>{today.charAt(0).toUpperCase() + today.slice(1)}</Text>
      </View>

      <View style={styles.todayCard}>
        <Text style={styles.todayTitle}>Oggi</Text>
        <View style={styles.todayRow}>
          <View style={styles.todayItem}>
            <Text style={styles.todayValue}>{data.prenotazioniInizioOggi}</Text>
            <Text style={styles.todayLabel}>Nuovi arrivi</Text>
          </View>
          <View style={styles.todayItem}>
            <Text style={styles.todayValue}>{data.vettureInRientroOggi}</Text>
            <Text style={styles.todayLabel}>Rientri</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Flotta</Text>
      <View style={styles.row}>
        <KpiCard label="Disponibili" value={data.vettureDisponibili} icon="check-circle" color={colors.success} colors={colors} />
        <KpiCard label="Prenotate" value={data.vetturePrenotate} icon="calendar" color={colors.warning} colors={colors} />
      </View>
      <View style={styles.row}>
        <KpiCard label="Totale vetture" value={data.totaleVetture} icon="truck" color={colors.primary} colors={colors} />
        <KpiCard label="Clienti" value={data.totaleClienti} icon="users" color={colors.info} colors={colors} />
      </View>

      <Text style={styles.sectionTitle}>Prenotazioni</Text>
      <View style={styles.row}>
        <KpiCard label="Attive" value={data.prenotazioniAttive} icon="clock" color={colors.primary} colors={colors} />
        <KpiCard label="Questo mese" value={data.prenotazioniMese} icon="bar-chart-2" color={colors.success} colors={colors} />
      </View>
    </ScrollView>
  );
}
