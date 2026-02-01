import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Linking, TouchableOpacity, Image, TextInput, Animated } from 'react-native';
import MapView, { Callout, Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { auth, firestore } from '../config/firebase';
import { collection, getDocs, where, query, onSnapshot, doc, updateDoc } from "firebase/firestore";
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as TaskManager from 'expo-task-manager';





const BACKGROUND_LOCATION_TASK = 'background-location-task';

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
        console.error('Background task error:', error);
        return;
    }
    if (data) {
        try {
            const { locations } = data;
            const location = locations[0];
            const user = auth.currentUser;

            if (!user || !location) return;

            const membersRef = collection(firestore, 'members');
            const q = query(membersRef, where('userId', '==', user.uid));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const memberDoc = querySnapshot.docs[0];
                await updateDoc(doc(firestore, 'members', memberDoc.id), {
                    currentLocation: {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        accuracy: location.coords.accuracy,
                        heading: location.coords.heading,
                        speed: location.coords.speed,
                    },
                    updatedAt: new Date()
                });
                console.log('Background location updated successfully');
            }
        } catch (error) {
            console.error('Background update error:', error);
        }
    }
});

export default function HomeScreen() {
    const navigation = useNavigation();
    const [locations, setLocations] = useState([]);
    const [places, setPlaces] = useState([]);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [initialRegion, setInitialRegion] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Add after other state declarations
    const filteredItems = () => {
        const query = searchQuery.toLowerCase();
        const filteredMembers = locations.filter(member =>
            member.name?.toLowerCase().includes(query)
        );
        const filteredPlaces = places.filter(place =>
            place.name?.toLowerCase().includes(query)
        );
        return {
            members: filteredMembers,
            places: filteredPlaces
        };
    };

    const readLocation = async () => {
        try {
            setIsLoading(true);
            const user = auth.currentUser;
            if (!user) {
                console.log("No user is signed in");
                return;
            }

            // Set up real-time listener for members
            const membersCollection = collection(firestore, "members");
            const membersQuery = query(membersCollection, where("inviterUserId", "==", user.uid));

            const unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
                const membersData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    type: 'member',
                    ...doc.data()
                }));
                setLocations(membersData);

                // Set initial region if not already set
                if (!initialRegion && membersData.length > 0) {
                    const firstLocation = membersData[0]?.currentLocation;
                    if (firstLocation) {
                        setInitialRegion({
                            latitude: firstLocation.latitude,
                            longitude: firstLocation.longitude,
                            latitudeDelta: 0.0922,
                            longitudeDelta: 0.0421,
                        });
                    }
                }
            });

            // Set up real-time listener for places
            const placesCollection = collection(firestore, "places");
            const placesQuery = query(placesCollection, where("userid", "==", user.uid));
            const unsubscribePlaces = onSnapshot(placesQuery, (snapshot) => {
                const placesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    type: 'place',
                    ...doc.data()
                }));
                setPlaces(placesData);
            });

            setIsLoading(false);

            // Return cleanup function for both subscriptions
            return () => {
                unsubscribeMembers();
                unsubscribePlaces();
            };
        } catch (error) {
            console.error("Error reading data: ", error);
            setIsLoading(false);
        }
    };




    const showCurrentLocation = async () => {
        try {
            // First check if location services are enabled
            const enabled = await Location.hasServicesEnabledAsync();
            if (!enabled) {
                Alert.alert(
                    'Location Services Disabled',
                    'Please enable Location Services in your device settings.',
                    [
                        { text: 'Cancel' },
                        {
                            text: 'Open Settings',
                            onPress: () => Linking.openSettings()
                        }
                    ]
                );
                return;
            }

            // Request foreground permissions first
            let { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
            if (foregroundStatus !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Location permission is required to use this feature.',
                    [{ text: 'OK' }]
                );
                return;
            }

            // Get current location with less strict settings
            let location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
                maximumAge: 10000, // Accept locations up to 10 seconds old
                timeout: 15000     // Wait up to 15 seconds for location
            });

            const newRegion = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            };

            setCurrentLocation(newRegion);
            mapRef.current?.animateToRegion(newRegion, 1000);

            // Request background permissions and start tracking
            let { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
            if (backgroundStatus === 'granted') {
                await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
                    accuracy: Location.Accuracy.BestForNavigation,
                    timeInterval: 10000, // Update every 10 seconds
                    distanceInterval: 5, // or after 5 meters
                    foregroundService: {
                        notificationTitle: "Location Tracking Active",
                        notificationBody: "ConnKeeper is tracking your location",
                        notificationColor: "#007AFF"
                    },
                    // Add these important background configs
                    showsBackgroundLocationIndicator: true,
                    activityType: Location.ActivityType.AutomotiveNavigation,
                    pausesUpdatesAutomatically: false,
                    deferredUpdatesInterval: 10000,
                    deferredUpdatesDistance: 5,
                    // Ensure background updates work
                    foregroundService: {
                        notificationTitle: "Location Tracking Active",
                        notificationBody: "ConnKeeper is tracking your location",
                        notificationColor: "#007AFF"
                    }
                });

                // Verify task is registered
                const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
                console.log('Background task registered:', isRegistered);
            }

        } catch (error) {
            console.error('Location error details:', error);

            // More specific error message based on the error type
            let errorMessage = 'Unable to get your location. Please try again.';
            if (error.code === 'E_LOCATION_SETTINGS_UNSATISFIED') {
                errorMessage = 'Please ensure Location Services are enabled with High Accuracy mode.';
            } else if (error.code === 'E_TIMEOUT') {
                errorMessage = 'Location request timed out. Please check your internet connection and try again.';
            }

            Alert.alert(
                'Location Error',
                errorMessage,
                [
                    { text: 'OK' },
                    {
                        text: 'Open Settings',
                        onPress: () => Linking.openSettings()
                    },
                    {
                        text: 'Try Again',
                        onPress: () => showCurrentLocation()
                    }
                ]
            );
        }
    };
    

    const mapRef = React.useRef(null);

    useEffect(() => {
        let unsubscribeData = null;

        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (user) {
                const setupSubscriptions = async () => {
                    try {
                        // Store the unsubscribe function returned from readLocation
                        const unsubscribe = await readLocation();
                        unsubscribeData = unsubscribe;
                        showCurrentLocation();
                    } catch (error) {
                        console.error('Error setting up subscriptions:', error);
                    }
                };

                setupSubscriptions();
            }
        });

        return () => {
            unsubscribeAuth();
            if (typeof unsubscribeData === 'function') {
                unsubscribeData();
            }
        };
    }, []);

    const handleMarkerPress = (member) => {
        setSelectedMember(member);
    };

    const formatLastUpdated = (timestamp) => {
        if (!timestamp) return 'Not available';

        let updateTime;

        // Safely convert timestamp to Date
        if (timestamp instanceof Date) {
            updateTime = timestamp;
        } else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
            updateTime = timestamp.toDate();
        } else {
            return 'Not available'; // fallback if timestamp is not valid
        }

        const now = new Date();
        const diffInMinutes = Math.floor((now - updateTime) / (1000 * 60));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
        return `${Math.floor(diffInMinutes / 1440)}d ago`;
    };


    const getMarkerColor = (timestamp) => {
        if (!timestamp) return '#999'; // Gray for no timestamp

        const now = new Date();

        // Safely convert Firestore Timestamp to JS Date
        let updateTime;
        if (timestamp instanceof Date) {
            updateTime = timestamp;
        } else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
            updateTime = timestamp.toDate();
        } else {
            return '#999'; // Invalid timestamp format
        }

        const diffInMinutes = Math.floor((now - updateTime) / (1000 * 60));

        if (diffInMinutes < 5) return '#4CAF50';   // Green for very recent
        if (diffInMinutes < 30) return '#2196F3';  // Blue for recent
        if (diffInMinutes < 60) return '#FFC107';  // Yellow for not so recent
        return '#FF5722';                          // Orange-red for old
    };


    return (
        <View style={styles.container}>
            {/* Add Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <View style={styles.searchIconContainer}>
                        <Ionicons name="search" size={20} color="#007AFF" />
                    </View>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search places or members..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#999"
                    />
                    {searchQuery !== '' && (
                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={() => setSearchQuery('')}
                        >
                            <View style={styles.clearButtonInner}>
                                <Ionicons name="close" size={16} color="#FFF" />
                            </View>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={initialRegion}
                showsUserLocation={true}
                showsMyLocationButton={false}
                showsCompass={true}
                rotateEnabled={true}
                zoomEnabled={true}
            >
                {/* Render Members */}
                {filteredItems().members.map((member) => (
                    member.currentLocation && (
                        <Marker
                            key={member.id}
                            coordinate={{
                                latitude: member.currentLocation.latitude,
                                longitude: member.currentLocation.longitude,
                            }}
                            onPress={() => handleMarkerPress(member)}
                        >

                            <View style={styles.markerContainer}>

                                <View style={[
                                    styles.markerImageContainer,
                                    { borderColor: getMarkerColor(member.updatedAt) }
                                ]}>
                                    <View style={[styles.initialsCircle, { backgroundColor: getMarkerColor(member.updatedAt) }]}>
                                        <Text style={styles.initialsText}>
                                            {member.name?.split(' ').map(word => word.charAt(0).toUpperCase()).join('')}
                                        </Text>
                                    </View>

                                    <View style={[
                                        styles.statusDot,
                                        { backgroundColor: getMarkerColor(member.updatedAt) }
                                    ]} />
                                </View>
                                <View style={styles.markerLabelContainer}>
                                    <Text style={styles.markerName}>{member.name}</Text>
                                    <Text style={styles.lastUpdateText}>
                                        {formatLastUpdated(member.updatedAt)}
                                    </Text>
                                </View>
                            </View>
                            <Callout>
                                <View style={styles.calloutContainer}>
                                    <Text style={styles.calloutName}>{member.name}</Text>
                                    <Text style={styles.calloutInfo}>
                                        Last updated: {formatLastUpdated(member.updatedAt)}
                                    </Text>
                                    <TouchableOpacity
                                        style={[
                                            styles.calloutButton,
                                            { backgroundColor: getMarkerColor(member.updatedAt) }
                                        ]}
                                        onPress={() => navigation.navigate('MemberDetails', { memberId: member.id })}
                                    >
                                        <Text style={styles.calloutButtonText}>View Details</Text>
                                    </TouchableOpacity>
                                </View>
                            </Callout>
                        </Marker>
                    )
                ))}

                {/* Render Places with Circles */}
                {filteredItems().places.map((place) => (
                    place.location && (
                        <React.Fragment key={place.id}>
                            <Circle
                                center={{
                                    latitude: place.location.latitude,
                                    longitude: place.location.longitude,
                                }}
                                radius={place.radius || 100}
                                fillColor="rgba(255, 149, 0, 0.1)"
                                strokeColor="rgba(255, 149, 0, 0.3)"
                                strokeWidth={1}
                            />
                            <Marker
                                coordinate={{
                                    latitude: place.location.latitude,
                                    longitude: place.location.longitude,
                                }}
                            >
                                <View style={styles.placeMarkerContainer}>
                                    <View style={styles.placeIconContainer}>
                                        <Ionicons
                                            name={place.type === 'home' ? 'home' : 'location'}
                                            size={24}
                                            color="#FF9500"
                                        />
                                    </View>
                                    <Text style={styles.placeMarkerName}>{place.name}</Text>
                                </View>
                                <Callout>
                                    <View style={styles.calloutContainer}>
                                        <Text style={styles.calloutName}>{place.name}</Text>
                                        <Text style={styles.calloutInfo}>
                                            Radius: {place.radius || 100}m
                                        </Text>
                                        <TouchableOpacity
                                            style={[styles.calloutButton, { backgroundColor: '#FF9500' }]}
                                            onPress={() => navigation.navigate('PlaceDetails', { place: place })}
                                        >
                                            <Text style={styles.calloutButtonText}>View Place</Text>
                                        </TouchableOpacity>
                                    </View>
                                </Callout>
                            </Marker>
                        </React.Fragment>
                    )
                ))}
            </MapView>

            <View style={styles.controlsContainer}>
                <TouchableOpacity
                    style={styles.locationButton}
                    onPress={showCurrentLocation}
                >
                    <Ionicons name="locate" size={24} color="#007AFF" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    map: {
        flex: 1,
    },
    searchContainer: {
        position: 'absolute',
        top: 60,
        left: 16,
        right: 16,
        zIndex: 1,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    searchIconContainer: {
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        padding: 8,
        borderRadius: 12,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1A1A1A',
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    clearButton: {
        marginLeft: 8,
        marginRight: 4,
    },
    clearButtonInner: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        padding: 6,
    },
    controlsContainer: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        gap: 12,
    },
    locationButton: {
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    placeMarkerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeIconContainer: {
        backgroundColor: 'white',
        padding: 8,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#FF9500',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    placeMarkerName: {
        backgroundColor: '#FF9500',
        color: 'white',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },

    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
    },
    markerContainer: {
        alignItems: 'center',
    },
    initialsCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    initialsText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    markerImageContainer: {
        position: 'relative',
        borderWidth: 3,
        borderRadius: 24,
        padding: 2,
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    markerImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    statusDot: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    markerLabelContainer: {
        backgroundColor: '#FFF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    markerName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1A1A1A',
        textAlign: 'center',
    },
    lastUpdateText: {
        fontSize: 10,
        color: '#666',
        textAlign: 'center',
    },
    calloutContainer: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 12,
        width: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    calloutName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    calloutInfo: {
        fontSize: 12,
        color: '#666',
        marginBottom: 8,
    },
    calloutButton: {
        backgroundColor: '#007AFF',
        padding: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    calloutButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '500',
    },
    
});
