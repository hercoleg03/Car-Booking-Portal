import React, { useState } from "react";
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

interface Cliente {
  id: number;
  nome: string;
  cognome: string;
  email: string | null;
  telefono: string | null;
  codiceFiscale: string | null;
  indirizzo: string | null;
  etichetta: string | null;
}

const ETICHETTA_COLORS: Record<string, { bg: string; text: string }> = {
  affidabile: { bg: "#22c55e22", text: "#22c55e" },
  da_monitorare: { bg: "#f59e0b22", text: "#f59e0b" },
  problematico: { bg: "#ef444422", text: "#ef4444" },
};
const ETICHETTA_LABELS: Record<string, string> = {
  affidabile: "Affidabile",
  da_monitorare: "Da monitorare",
  problematico: "Problematico",
};

function initials(nome: string, cognome: string) {
  return `${nome.charAt(0)}${cognome.charAt(0)}`.toUpperCase();
}

function ClienteCard({ item, colors, onPress }: {
  item: Cliente;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const etichettaInfo = item.etichetta ? ETICHETTA_COLORS[item.etichetta] : null;

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginHorizontal: 16,
      marginBottom: 10,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary + "22",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 16,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
    },
    info: {
      flex: 1,
      gap: 2,
    },
    name: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    detail: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    badge: {
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: etichettaInfo?.bg ?? "transparent",
    },
    badgeText: {
      fontSize: 10,
      fontFamily: "Inter_600SemiBold",
      color: etichettaInfo?.text ?? "transparent",
    },
  });

  return (
    <Pressable style={styles.card} onPress={onPress} testID={`cliente-${item.id}`}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(item.nome, item.cognome)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.nome} {item.cognome}</Text>
        {item.email && <Text style={styles.detail} numberOfLines={1}>{item.email}</Text>}
        {item.telefono && <Text style={styles.detail}>{item.telefono}</Text>}
      </View>
      {item.etichetta && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{ETICHETTA_LABELS[item.etichetta] ?? item.etichetta}</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function ClientiScreen() {
  const colors = useColors();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch, isFetching } = useApiQuery<Cliente[]>(
    ["clienti", search],
    "/clienti",
    { params: search.trim() ? { search: search.trim() } : {} }
  );

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
      paddingTop: 40,
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
          placeholder="Cerca per nome, cognome, email..."
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
          <Text style={styles.emptyText}>Impossibile caricare i clienti</Text>
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
          <ClienteCard
            item={item}
            colors={colors}
            onPress={() => router.push(`/cliente/${item.id}`)}
          />
        )}
        ListHeaderComponent={searchHeader}
        ListEmptyComponent={
          <View style={styles.center}>
            <Feather name="users" size={36} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Nessun cliente trovato</Text>
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
