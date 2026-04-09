import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useApiQuery } from "@/hooks/useApi";

interface Cliente {
  id: number;
  nome: string;
  cognome: string;
  email: string | null;
  telefono: string | null;
  codiceFiscale: string | null;
  indirizzo: string | null;
  etichetta: string | null;
  note: string | null;
}

interface Prenotazione {
  id: number;
  stato: string;
  dataInizio: string;
  dataFine: string;
  vettura: { marca: string; modello: string; targa: string } | null;
}

interface ClienteStorico {
  cliente: Cliente;
  prenotazioni: Prenotazione[];
}

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
};
const ETICHETTA_LABELS: Record<string, string> = {
  affidabile: "Affidabile",
  da_monitorare: "Da monitorare",
  problematico: "Problematico",
};
const ETICHETTA_COLORS: Record<string, string> = {
  affidabile: "#22c55e",
  da_monitorare: "#f59e0b",
  problematico: "#ef4444",
};

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function initials(nome: string, cognome: string) {
  return `${nome.charAt(0)}${cognome.charAt(0)}`.toUpperCase();
}

export default function ClienteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();

  const { data, isLoading, isError, refetch } = useApiQuery<ClienteStorico>(
    ["cliente-storico", id],
    `/clienti/${id}/storico`,
    { enabled: !!id }
  );

  const topPad = Platform.OS === "web" ? 67 : 0;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
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
    listContent: {
      paddingTop: topPad + 16,
      paddingHorizontal: 16,
      paddingBottom: 40,
      gap: 12,
    },
    avatarRow: {
      alignItems: "center",
      gap: 12,
      marginBottom: 8,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary + "22",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
    },
    fullName: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    etichettaBadge: {
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    etichettaText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
    },
    infoCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
    },
    infoLabel: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      flex: 1,
    },
    infoValue: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
    },
    divider: { height: 1, backgroundColor: colors.border },
    sectionTitle: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    prenotazioneItem: {
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 6,
    },
    prenotazioneTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    prenotazioneVettura: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    prenotazioneDate: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    statoBadge: {
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    statoBadgeText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
    },
  });

  if (isLoading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (isError || !data) {
    return (
      <View style={[styles.container, styles.center]}>
        <Feather name="alert-circle" size={36} color={colors.mutedForeground} />
        <Text style={styles.errorText}>Cliente non trovato</Text>
        <Pressable style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryBtnText}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  const { cliente, prenotazioni } = data;
  const etichettaColor = cliente.etichetta ? ETICHETTA_COLORS[cliente.etichetta] : null;

  const header = (
    <View style={{ gap: 12 }}>
      <View style={styles.avatarRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(cliente.nome, cliente.cognome)}</Text>
        </View>
        <Text style={styles.fullName}>{cliente.nome} {cliente.cognome}</Text>
        {cliente.etichetta && etichettaColor && (
          <View style={[styles.etichettaBadge, { backgroundColor: etichettaColor + "22" }]}>
            <Text style={[styles.etichettaText, { color: etichettaColor }]}>
              {ETICHETTA_LABELS[cliente.etichetta] ?? cliente.etichetta}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.infoCard}>
        {cliente.email && (
          <>
            <Pressable style={styles.infoRow} onPress={() => Linking.openURL(`mailto:${cliente.email}`)}>
              <Feather name="mail" size={16} color={colors.primary} />
              <Text style={[styles.infoValue, { color: colors.primary }]} numberOfLines={1}>{cliente.email}</Text>
            </Pressable>
            <View style={styles.divider} />
          </>
        )}
        {cliente.telefono && (
          <>
            <Pressable style={styles.infoRow} onPress={() => Linking.openURL(`tel:${cliente.telefono}`)}>
              <Feather name="phone" size={16} color={colors.primary} />
              <Text style={[styles.infoValue, { color: colors.primary }]}>{cliente.telefono}</Text>
            </Pressable>
            {(cliente.codiceFiscale || cliente.indirizzo) && <View style={styles.divider} />}
          </>
        )}
        {cliente.codiceFiscale && (
          <>
            <View style={styles.infoRow}>
              <Feather name="credit-card" size={16} color={colors.mutedForeground} />
              <Text style={styles.infoLabel}>Cod. Fiscale</Text>
              <Text style={styles.infoValue}>{cliente.codiceFiscale}</Text>
            </View>
            {cliente.indirizzo && <View style={styles.divider} />}
          </>
        )}
        {cliente.indirizzo && (
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={16} color={colors.mutedForeground} />
            <Text style={[styles.infoValue, { flex: 1 }]} numberOfLines={2}>{cliente.indirizzo}</Text>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Storico prenotazioni ({prenotazioni.length})</Text>
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listContent}
      data={prenotazioni}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={header}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      renderItem={({ item }) => {
        const statoColor = STATO_COLORS[item.stato] ?? colors.mutedForeground;
        return (
          <Pressable
            style={styles.prenotazioneItem}
            onPress={() => router.push(`/prenotazione/${item.id}`)}
          >
            <View style={styles.prenotazioneTopRow}>
              <Text style={styles.prenotazioneVettura} numberOfLines={1}>
                {item.vettura ? `${item.vettura.marca} ${item.vettura.modello}` : "Vettura sconosciuta"}
              </Text>
              <View style={[styles.statoBadge, { backgroundColor: statoColor + "22" }]}>
                <Text style={[styles.statoBadgeText, { color: statoColor }]}>
                  {STATO_LABELS[item.stato] ?? item.stato}
                </Text>
              </View>
            </View>
            <Text style={styles.prenotazioneDate}>
              {formatDate(item.dataInizio)} → {formatDate(item.dataFine)}
            </Text>
            {item.vettura?.targa && (
              <Text style={[styles.prenotazioneDate, { fontFamily: "Inter_500Medium" }]}>{item.vettura.targa}</Text>
            )}
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <View style={{ alignItems: "center", gap: 8, paddingTop: 24 }}>
          <Feather name="calendar" size={28} color={colors.mutedForeground} />
          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
            Nessuna prenotazione trovata
          </Text>
        </View>
      }
      showsVerticalScrollIndicator={false}
    />
  );
}
