import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

const STATO_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  disponibile: { bg: "#22c55e22", text: "#22c55e", label: "Disponibile" },
  prenotata: { bg: "#f59e0b22", text: "#f59e0b", label: "Prenotata" },
  manutenzione: { bg: "#ef444422", text: "#ef4444", label: "Manutenzione" },
};

function VetturaCard({ item, colors, onPress }: {
  item: Vettura;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const statusKey = item.stato in STATO_COLORS ? item.stato : (item.disponibile ? "disponibile" : "prenotata");
  const statusInfo = STATO_COLORS[statusKey] ?? { bg: "#6b728022", text: "#6b7280", label: item.stato };

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 10,
      gap: 8,
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    name: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      flex: 1,
    },
    badge: {
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 3,
      backgroundColor: statusInfo.bg,
    },
    badgeText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: statusInfo.text,
    },
    detailRow: {
      flexDirection: "row",
      gap: 16,
      flexWrap: "wrap",
    },
    detail: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    detailText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    targa: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      letterSpacing: 1,
    },
  });

  return (
    <Pressable style={styles.card} onPress={onPress} testID={`vettura-${item.id}`}>
      <View style={styles.topRow}>
        <Text style={styles.name}>{item.marca} {item.modello}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{statusInfo.label}</Text>
        </View>
      </View>
      <Text style={styles.targa}>{item.targa}</Text>
      <View style={styles.detailRow}>
        <View style={styles.detail}>
          <Feather name="calendar" size={11} color={colors.mutedForeground} />
          <Text style={styles.detailText}>{item.anno}</Text>
        </View>
        <View style={styles.detail}>
          <Feather name="zap" size={11} color={colors.mutedForeground} />
          <Text style={styles.detailText}>{item.carburante}</Text>
        </View>
        {item.km != null && (
          <View style={styles.detail}>
            <Feather name="activity" size={11} color={colors.mutedForeground} />
            <Text style={styles.detailText}>{item.km.toLocaleString("it-IT")} km</Text>
          </View>
        )}
        {item.colore && (
          <View style={styles.detail}>
            <Feather name="droplet" size={11} color={colors.mutedForeground} />
            <Text style={styles.detailText}>{item.colore}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function InventarioScreen() {
  const colors = useColors();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch, isFetching } = useApiQuery<Vettura[]>(
    ["vetture"],
    "/vetture"
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(
      (v) =>
        v.targa.toLowerCase().includes(q) ||
        v.marca.toLowerCase().includes(q) ||
        v.modello.toLowerCase().includes(q)
    );
  }, [data, search]);

  const topPad = Platform.OS === "web" ? 67 : 0;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      marginHorizontal: 16,
      marginBottom: 12,
      paddingHorizontal: 12,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 11,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
    },
    searchHeader: {
      paddingTop: topPad + 16,
      paddingBottom: 4,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 12,
    },
    emptyText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
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
    listContent: {
      paddingTop: 4,
      paddingBottom: Platform.OS === "web" ? 84 : 20,
    },
  });

  const searchHeader = (
    <View style={styles.searchHeader}>
      <View style={styles.searchWrap}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Cerca per targa, marca, modello..."
          placeholderTextColor={colors.mutedForeground}
          clearButtonMode="while-editing"
        />
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        {searchHeader}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        {searchHeader}
        <View style={styles.center}>
          <Feather name="wifi-off" size={36} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Impossibile caricare le vetture</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Riprova</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <VetturaCard
            item={item}
            colors={colors}
            onPress={() => router.push(`/vettura/${item.id}`)}
          />
        )}
        ListHeaderComponent={searchHeader}
        ListEmptyComponent={
          <View style={styles.center}>
            <Feather name="truck" size={36} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessuna vettura trovata</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
