import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
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
  targa: string;
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
  return new Date(d + "T00:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getStatus(data: string): { label: string; bg: string; text: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(data + "T00:00:00");
  if (d < today) return { label: "Completata", bg: "#6b728022", text: "#6b7280" };
  if (d.getTime() === today.getTime()) return { label: "Oggi", bg: "#3b82f622", text: "#3b82f6" };
  return { label: "Pianificata", bg: "#f59e0b22", text: "#f59e0b" };
}

function ManutenzioneCard({ item, colors, onPress }: {
  item: Manutenzione;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const status = getStatus(item.data);

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
    tipo: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      flex: 1,
    },
    badge: {
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 3,
      backgroundColor: status.bg,
    },
    badgeText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: status.text,
    },
    vetturaNome: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    detailRow: {
      flexDirection: "row",
      gap: 16,
      alignItems: "center",
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
    descrizione: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      fontStyle: "italic",
    },
  });

  return (
    <Pressable style={styles.card} onPress={onPress} testID={`manutenzione-${item.id}`}>
      <View style={styles.topRow}>
        <Text style={styles.tipo}>{item.tipo}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{status.label}</Text>
        </View>
      </View>
      {item.vettura && (
        <Text style={styles.vetturaNome}>
          {item.vettura.marca} {item.vettura.modello} — {item.vettura.targa}
        </Text>
      )}
      <View style={styles.detailRow}>
        <View style={styles.detail}>
          <Feather name="calendar" size={12} color={colors.mutedForeground} />
          <Text style={styles.detailText}>{formatDate(item.data)}</Text>
        </View>
        {item.costo != null && (
          <View style={styles.detail}>
            <Feather name="tag" size={12} color={colors.mutedForeground} />
            <Text style={styles.detailText}>€{item.costo.toLocaleString("it-IT")}</Text>
          </View>
        )}
      </View>
      {item.descrizione && (
        <Text style={styles.descrizione} numberOfLines={2}>{item.descrizione}</Text>
      )}
    </Pressable>
  );
}

export default function ManutenzioniScreen() {
  const colors = useColors();
  const router = useRouter();

  const { data, isLoading, isError, refetch, isFetching } = useApiQuery<Manutenzione[]>(
    ["manutenzioni"],
    "/manutenzioni"
  );

  const topPad = Platform.OS === "web" ? 67 : 0;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
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
      paddingTop: topPad + 16,
      paddingBottom: Platform.OS === "web" ? 84 : 20,
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, styles.center]}>
        <Feather name="wifi-off" size={36} color={colors.mutedForeground} />
        <Text style={styles.emptyText}>Impossibile caricare le manutenzioni</Text>
        <Pressable style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryBtnText}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ManutenzioneCard
            item={item}
            colors={colors}
            onPress={() => router.push(`/manutenzione/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={[styles.center, { paddingTop: 80 }]}>
            <Feather name="tool" size={36} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessuna manutenzione</Text>
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
