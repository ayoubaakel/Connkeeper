import React, { useState } from 'react';
import { View, StyleSheet, Text, SafeAreaView } from 'react-native';
import { AddItemOption } from '../components/add-items/AddItemOption';
import { useNavigation } from '@react-navigation/native';

export default function AddItemsScreen() {
    const options = [
        {
            id: 'places',
            title: 'Add Place',
            icon: 'location-outline',
            screen: 'AddPlace',
        },
        {
            id: 'tasks',
            title: 'Add Task',
            icon: 'checkbox-outline',
            screen: 'AddTask',
        },
        {
            id: 'members',
            title: 'Add Member',
            icon: 'add',
            screen: 'MemberListScreen',
        },
    ];

    const navigation = useNavigation();

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {options.map((option) => (
                    <AddItemOption
                        key={option.id}
                        title={option.title}
                        icon={option.icon}
                        onPress={() => navigation.navigate(option.screen)}
                    />
                ))}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#F3F4F6',
    },
});
