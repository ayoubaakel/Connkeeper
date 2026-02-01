import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Switch, TouchableOpacity, SafeAreaView, Linking, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { auth, firestore } from "../config/firebase";  // adjust the path according to your project structure
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';  // Add this import
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location'; // Import Expo Location

export default function SettingsScreen() {
    const navigation = useNavigation();
    const [userName, setUserName] = useState('Loading...');
    const [locationSharing, setLocationSharing] = useState(false);


    const handleLogout = async () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to log out?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Yes, Logout",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await auth.signOut();
                            await AsyncStorage.removeItem('userToken');
                            navigation.replace('Auth');
                        } catch (error) {
                            console.error('Logout error:', error);
                            Alert.alert('Error', 'Failed to sign out. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const userDocRef = doc(firestore, 'users', user.uid);
        const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const userData = docSnapshot.data();
                setUserName(userData.fullName || 'Loading...');
                setLocationSharing(userData.shareLocation || false);
            }
        });

        return () => unsubscribe();
    }, []);


    const handleLocationSharingChange = async (value) => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const userDocRef = doc(firestore, 'users', user.uid);

            if (value) {
                // Request permission to access location
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission denied', 'Location permission is required to share your location.');
                    return;
                }

                // Optionally get current location
                const location = await Location.getCurrentPositionAsync({});
                const locationData = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                };

                // Save to Firestore
                await updateDoc(userDocRef, {
                    shareLocation: true,
                    lastLocation: locationData,
                    lastLocationTimestamp: new Date(),
                });

                await AsyncStorage.setItem('locationTracking', 'enabled');
            } else {
                // Disable location sharing and clear data
                await updateDoc(userDocRef, {
                    shareLocation: false,
                    lastLocation: null,
                    lastLocationTimestamp: null,
                });

                await AsyncStorage.removeItem('locationTracking');

                try {
                    // Try to stop location updates, but don't throw if it fails
                    await Location.stopLocationUpdatesAsync('location-tracking').catch(() => { });
                } catch (error) {
                    // Ignore any errors from stopping location updates
                    console.log('Note: Location tracking may not have been active');
                }

                // Inform user about manually revoking permissions
                Alert.alert(
                    'Location Sharing Disabled',
                    'To completely stop sharing location, you may also want to revoke location permissions in your device settings.',
                    [
                        {
                            text: 'OK',
                            style: 'default'
                        },
                        {
                            text: 'Open Settings',
                            onPress: () => {
                                Linking.openSettings();
                            }
                        }
                    ]
                );
            }

            setLocationSharing(value);
        } catch (error) {
            console.error('Error updating location sharing:', error);
            Alert.alert('Error', 'Failed to update location sharing settings');
            setLocationSharing(!value); // Revert switch state
        }
    };

    const SettingsItem = ({ icon, title, hasSwitch, hasArrow, onPress, value, onValueChange }) => (
        <TouchableOpacity
            style={styles.settingsItem}
            onPress={onPress}
            disabled={hasSwitch}
        >
            <View style={styles.settingsItemLeft}>
                <Ionicons
                    name={icon}
                    size={22}
                    color={title === 'Account' ? '#4CAF50' :
                        title === 'Help' ? '#2196F3' :
                            title === 'Logout' ? '#FF4081' :
                                title === 'About' ? '#607D8B' : '#007AFF'}
                />
                <Text style={styles.settingsItemText}>{title}</Text>
            </View>
            {hasSwitch && (
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                />
            )}
            {hasArrow && (
                <Ionicons name="chevron-forward" size={20} color={title === 'Logout' ? '#FF4081' : '#666'} />
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Profile Section */}
            <View style={styles.profileSection}>
                {/* <Image
                    style={styles.profileImage}
                    source={{ uri: 'https://img.freepik.com/free-psd/3d-illustration-person-with-sunglasses_23-2149436188.jpg' }}
                /> */}
                <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                        {userName && userName !== 'Loading...' ? userName.charAt(0).toUpperCase() : '?'}
                    </Text>
                </View>
                <Text style={styles.profileName}>{userName}</Text>
                { /*   <Text style={styles.profileTitle}>Visual Designer</Text>
                <TouchableOpacity style={styles.upgradeButton}>
                     <Text style={styles.upgradeButtonText}>Upgrade Now - Go Pro</Text>
                </TouchableOpacity>  */}
            </View>

            <Text style={styles.sectionTitle}>Settings</Text>

            {/* Settings Items */}
            <View style={styles.settingsContainer}>
                <SettingsItem
                    icon="location"
                    title="Share My Location"
                    hasSwitch={true}
                    value={locationSharing}
                    onValueChange={handleLocationSharingChange}
                />
                <SettingsItem
                    icon="notifications"
                    title="Notifications"
                    hasArrow={true}
                    onPress={() => navigation.navigate('NotificationSettings')}
                />
                {/*  <SettingsItem
                    icon="lock-closed"
                    title="Privacy"
                    hasArrow={true}
                    onPress={() => navigation.navigate('Privacy')}
                /> */}
                <SettingsItem
                    icon="shield"
                    title="Security"
                    hasArrow={true}
                    onPress={() => navigation.navigate('SecuritySettings')}
                />
                <SettingsItem
                    icon="person"
                    title="Account"
                    hasArrow={true}
                    onPress={() => navigation.navigate('PersonalInformation')}
                />
                <SettingsItem
                    icon="help-circle"
                    title="Help"
                    hasArrow={true}
                    onPress={() => navigation.navigate('HelpSettings')}
                />
                <SettingsItem
                    icon="document-text"
                    title="Legal & Privacy"
                    hasArrow={true}
                    onPress={() => navigation.navigate('LegalScreen')}
                />
                <SettingsItem
                    icon="log-out"
                    title="Logout"
                    hasArrow={true}
                    onPress={handleLogout}
                />
            </View>
            <Text style={styles.version}>Version 1.0.3</Text>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    profileSection: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 10,
    },
    profileName: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 5,
    },
    profileTitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 15,
    },
    upgradeButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    upgradeButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 20,
        marginLeft: 20,
        marginBottom: 10,
    },
    settingsContainer: {
        backgroundColor: '#fff',
        borderRadius: 15,
        marginHorizontal: 15,
    },
    avatarCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    avatarText: {
        color: '#FFF',
        fontSize: 32,
        fontWeight: 'bold',
    },
    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    settingsItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingsItemText: {
        marginLeft: 15,
        fontSize: 16,
    },
    version: {
        textAlign: 'center',
        color: '#777',
        marginTop: 16,
    },
});