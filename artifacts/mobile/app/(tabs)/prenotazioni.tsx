import React, { useState } from "react";
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
  carburante: string;
}

interface Cliente {
  id: number | null;
  nome: string;
  cognome: string;
  email: string | null;
  telefono: string | null;
}

interface Prenotazione {
  id: number;
  vetturaId: number;
  clienteId: number | null;
  nomeLibero: string | null;
  cognomeLibero: string | null;
  dataInizio: string;
  dataFine: string;
  stato: string;
  note: string | null;
  prezzoTotale: number | null;
  vettura: Vettura | null;
  cliente: Cliente | null;
}

const STATI = ["Tutte", "attiva", "in_corso", "completata", "annullata"] as const;
type Stato = (typeof STATI)[number];

const STATO_COLORS: Record<string, string> = {
  attiva: "#3b82f6",
  in_corso: "#22c55e",
  completata: "#6b7280",
  annullata: "#ef4444",
};
const STATO_LABELS: Record<string, string> = {
  attiva: "Attiva",
  in_corso: "In corso",
  completata: "Completata",
  annullata: "Annullata",
  Tutte: "Tutte",
};

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getClienteName(p: Prenotazione) {
  if (p.cliente?.id != null) {
    return `${p.cliente.nome ?? ""} ${p.cliente.cognome ?? ""}`.trim() || "–";
  }
  return `${p.nomeLibero ?? ""} ${p.cognomeLibero ?? ""}`.trim() || "–";
}

function PrenotazioneCard({ item, colors, onPress }: {
  item: Prenotazione;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const statoColor = STATO_COLORS[item.stato] ?? colors.mutedForeground;
  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 10,
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    vetturaNome: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      flex: 1,
    },
    badge: {
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 3,
      backgroundColor: statoColor + "22",
    },
    badgeText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: statoColor,
    },
    clienteText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    datesRow: {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
    },
    dateText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
    },
    dateSep: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
    targa: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
  });

  const vetturaNome = item.vettura
    ? `${item.vettura.marca} ${item.vettura.modello}`
    : "Vettura sconosciuta";

  return (
    <Pressable style={styles.card} onPress={onPress} testID={`prenotazione-${item.id}`}>
      <View style={styles.topRow}>
        <Text style={styles.vetturaNome} numberOfLines={1}>{vetturaNome}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{STATO_LABELS[item.stato] ?? item.stato}</Text>
        </View>
      </View>
      <Text style={styles.clienteText}>{getClienteName(item)}</Text>
      <View style={styles.datesRow}>
        <Feather name="calendar" size={12} color={colors.mutedForeground} />
        <Text style={styles.dateText}>{formatDate(item.dataInizio)}</Text>
        <Text style={styles.dateSep}>→</Text>
        <Text style={styles.dateText}>{formatDate(item.dataFine)}</Text>
      </View>
      {item.vettura?.targa && <Text style={styles.targa}>{item.vettura.targa}</Text>}
    </Pressable>
  );
}

export default function PrenotazioniScreen() {
  const colors = useColors();
  const router = useRouter();
  const [filtroStato, setFiltroStato] = useState<Stato>("Tutte");

  const params = filtroStato !== "Tutte" ? { stato: filtroStato } : {};
  const { data, isLoading, isError, refetch, isFetching } = useApiQuery<Prenotazione[]>(
    ["prenotazioni", filtroStato],
    "/prenotazioni",
    { params }
  );

  const topPad = Platform.OS === "web" ? 67 : 0;
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    filterRow: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: topPad + 16,
      paddingBottom: 12,
    },
    filterBtn: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterBtnText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    filterBtnTextActive: {
      color: colors.primaryForeground,
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

  const filterBar = (
    <FlatList
      horizontal
      data={STATI as unknown as Stato[]}
      keyExtractor={(item) => item}
      renderItem={({ item }) => {
        const active = item === filtroStato;
        return (
          <Pressable
            style={[styles.filterBtn, active && styles.filterBtnActive]}
            onPress={() => setFiltroStato(item)}
          >
            <Text style={[styles.filterBtnText, active && styles.filterBtnTextActive]}>
              {STATO_LABELS[item]}
            </Text>
          </Pressable>
        );
      }}
      contentContainerStyle={styles.filterRow}
      showsHorizontalScrollIndicator={false}
    />
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        {filterBar}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        {filterBar}
        <View style={styles.center}>
          <Feather name="wifi-off" size={36} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>Impossibile caricare le prenotazioni</Text>
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
        data={data ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <PrenotazioneCard
            item={item}
            colors={colors}
            onPress={() => router.push(`/prenotazione/${item.id}`)}
          />
        )}
        ListHeaderComponent={filterBar}
        ListEmptyComponent={
          <View style={styles.center}>
            <Feather name="calendar" size={36} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessuna prenotazione</Text>
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
