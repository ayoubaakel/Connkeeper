import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
    icon: "settings";
    title: string;
    message: string;
}

export function EmptyState({ icon, title, message }: EmptyStateProps) {
    return (
        <View style={styles.container}>
            <Ionicons name={icon} size={48} color="#9CA3AF" style={styles.icon} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    icon: {
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
    },
    message: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
    },
});