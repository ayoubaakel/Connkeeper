import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, TextInput } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const ListPlacesScreen = () => {
    const navigation = useNavigation();
    const [places, setPlaces] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchText, setSearchText] = useState('');


    const filteredPlaces = places.filter(place => 
        place.name.toLowerCase().includes(searchText.toLowerCase()) ||
        place.description.toLowerCase().includes(searchText.toLowerCase())
    );


    const fetchPlaces = async () => {
        const auth = getAuth();
        const currentId = auth.currentUser ? auth.currentUser.uid : null;

        if (!currentId) return;

        const db = getFirestore();
        const placesRef = collection(db, "places");
        const q = query(placesRef, where("userid", "==", currentId));

        const querySnapshot = await getDocs(q);
        const placesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setPlaces(placesList);
    };

    // Fetch places when screen is focused
    useFocusEffect(
        useCallback(() => {
            fetchPlaces();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchPlaces().finally(() => setRefreshing(false));
    };

    const renderPlace = ({ item }) => (
        <TouchableOpacity
            style={styles.placeCard}
            onPress={() => navigation.navigate('PlaceDetails', { place: item })}
        >
            <View style={styles.iconContainer}>
                <Ionicons name="location" size={24} color="#007AFF" />
            </View>
            <View style={styles.placeInfo}>
                <Text style={styles.placeName}>{item.name}</Text>
                <Text numberOfLines={2} style={styles.placeDescription}>
                    {item.radius} M
                </Text>
            </View>
            <View style={styles.arrowContainer}>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Places</Text>
                <Text style={styles.subtitle}>
                    {places.length} {places.length === 1 ? 'place' : 'places'} saved
                </Text>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search places..."
                        value={searchText}
                        onChangeText={setSearchText}
                        placeholderTextColor="#8E8E93"
                    />
                </View>
            </View>

            <FlatList
                data={filteredPlaces}
                keyExtractor={(item) => item.id}
                renderItem={renderPlace}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#007AFF"
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="location-outline" size={60} color="#C7C7CC" />
                        <Text style={styles.emptyText}>No places found</Text>
                        <Text style={styles.emptySubtext}>
                            Add your first place by tapping the + button
                        </Text>
                    </View>
                }
                showsVerticalScrollIndicator={false}
            />

            <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('AddPlace')}
            >
                <Ionicons name="add" size={28} color="#FFF" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    header: {
        padding: 16,
        paddingTop: 55,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1C1C1E',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 15,
        color: '#8E8E93',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        marginTop: 12, 
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1C1C1E',
        marginLeft: 8,
    },
    searchIcon: {
        marginRight: 8,
    },
    list: {
        flex: 1,
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    placeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    placeInfo: {
        flex: 1,
        marginRight: 8,
        justifyContent: 'center',
    },
    placeName: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1C1C1E',
        marginBottom: 4,
    },
    placeDescription: {
        fontSize: 14,
        color: '#8E8E93',
        lineHeight: 20,
    },
    arrowContainer: {
        padding: 4,
    },
    addButton: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#007AFF',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#8E8E93',
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 15,
        color: '#8E8E93',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 32,
    },
});

export default ListPlacesScreen;
