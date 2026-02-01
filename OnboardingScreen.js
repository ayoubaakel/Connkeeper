import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Linking, Dimensions, TouchableOpacity, FlatList, Image, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TrackingTransparency from 'expo-tracking-transparency';

const { width, height } = Dimensions.get('window');

const onboardingData = [
    {
        id: '1',
        title: 'Track Your Circle',
        description: 'Keep track of your family and friends in real-time with live location sharing.',
        image: require('../assets/location-tracking.png')
    },
    {
        id: '2',
        title: 'Safe Zones',
        description: 'Create safe zones and get notified when your loved ones enter or leave these areas.',
        image: require('../assets/safe.png')
    },
    {
        id: '3',
        title: 'Stay Connected',
        description: 'Share locations and stay connected with your circle members effortlessly.',
        image: require('../assets/connect.png')
    },
    {
        id: '4',
        title: 'Location Access',
        description: 'ConnKeeper needs location access to share your location with family members and track safe zones.',
        image: require('../assets/location.png'),
        permission: 'location'
    },
    {
        id: '5',
        title: 'Background Location',
        description: 'Allow background location to keep sharing your location even when the app is closed.',
        image: require('../assets/background.png'),
        permission: 'background-location'
    },
    {
        id: '6',
        title: 'Notifications',
        description: 'Enable notifications to get alerts when family members enter or leave safe zones.',
        image: require('../assets/notification.png'),
        permission: 'notification'
    },
    {
        id: '7',
        title: 'Personalized Experience',
        description: 'Allow app tracking to enable personalized location-based features and help us improve your experience with ConnKeeper. Your data will only be used to enhance app functionality and services.',
        image: require('../assets/location-tracker.png'),
        permission: 'tracking'
    }
];




const OnboardingScreen = () => {
    const navigation = useNavigation();
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef(null);
    const [loading, setLoading] = useState(false);

      //  permission handling
      const handlePermissions = async (permission) => {
        try {
            switch (permission) {
                case 'location':
                    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
                    if (foregroundStatus === 'granted') {
                        return true;
                    }
                    
                    Alert.alert(
                        'Location Permission Required',
                        'ConnKeeper needs location access to function properly.',
                        [
                            { text: 'Open Settings', onPress: () => Linking.openSettings() },
                            { text: 'Skip', onPress: () => scrollToNext() }
                        ]
                    );
                    return false;
    
                case 'background-location':
                    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
                    if (bgStatus === 'granted'){
                        return true;
                    }
                    
                    Alert.alert(
                        'Background Location',
                        'Background location helps track your family members even when the app is closed.',
                        [
                            { text: 'Open Settings', onPress: () => Linking.openSettings() },
                            { text: 'Continue', onPress: () => scrollToNext() }
                        ]
                    );
                    return false;
    
                case 'notification':
                    const { status: notifStatus } = await Notifications.requestPermissionsAsync({
                        ios: {
                            allowAlert: true,
                            allowBadge: true,
                            allowSound: true,
                        },
                    });
                    if (notifStatus === 'granted') {
                        return true;
                    }
                    
                    Alert.alert(
                        'Notifications Required',
                        'Notifications are essential for receiving alerts about your family members.',
                        [
                            { text: 'Open Settings', onPress: () => Linking.openSettings() },
                            { text: 'Continue', onPress: () => scrollToNext() }
                        ]
                    );
                    return false;

                    case 'tracking':
                        const { status: trackingStatus } = await TrackingTransparency.requestTrackingPermissionsAsync();
                        if (trackingStatus === 'granted') {
                            return true;
                        }
                        
                        Alert.alert(
                            'Tracking Permission',
                            'We use tracking to provide personalized location services and improve your experience.',
                            [
                                { text: 'Open Settings', onPress: () => Linking.openSettings() },
                                { text: 'Continue', onPress: () => scrollToNext() }
                            ]
                        );
                        return false;
            }
        } catch (error) {
            console.error('Permission error:', error);
            return false;
        }
    };

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (token) {
                navigation.replace('MainTabs');
            }
        } catch (error) {
            console.log('Error checking auth status:', error);
        }
    };

    const viewableItemsChanged = useRef(({ viewableItems }) => {
        setCurrentIndex(viewableItems[0]?.index || 0);
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

   //  scrollTo function
const scrollTo = async () => {
    if (loading) return;
    const currentItem = onboardingData[currentIndex];
    
    if (currentItem.permission) {
        setLoading(true);
        const granted = await handlePermissions(currentItem.permission);
        setLoading(false);
        
        if (!granted) return;
    }
    
    if (currentIndex === onboardingData.length - 1) {
        await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    }
    
    scrollToNext();
};

    const scrollToNext = () => {
        if (currentIndex < onboardingData.length - 1) {
            slidesRef.current.scrollToIndex({ index: currentIndex + 1 });
        } else {
            navigation.replace('Auth');
        }
    };

    const renderItem = ({ item }) => {
        return (
            <View style={styles.slide}>
                <Image source={item.image} style={styles.image} />
                <View style={styles.textContainer}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.description}>{item.description}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.skipButton}>
                <TouchableOpacity onPress={() => navigation.replace('Auth')}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={onboardingData}
                renderItem={renderItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                bounces={false}
                keyExtractor={(item) => item.id}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                    useNativeDriver: false,
                })}
                onViewableItemsChanged={viewableItemsChanged}
                viewabilityConfig={viewConfig}
                ref={slidesRef}
               //  scrollEnabled={false}  // Add this line to disable manual scrolling

            />

            <View style={styles.bottomContainer}>
                <View style={styles.pagination}>
                    {onboardingData.map((_, i) => {
                        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [10, 20, 10],
                            extrapolate: 'clamp',
                        });
                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });
                        return (
                            <Animated.View
                                style={[styles.dot, { width: dotWidth, opacity }]}
                                key={i.toString()}
                            />
                        );
                    })}
                </View>

                <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={scrollTo}
            disabled={loading}
        >
            <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>
                    {loading ? 'Loading...' : currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
                </Text>
                {!loading && (
                    <Ionicons 
                        name={currentIndex === onboardingData.length - 1 ? 'rocket' : 'arrow-forward'} 
                        size={20} 
                        color="#FFF" 
                        style={styles.buttonIcon}
                    />
                )}
            </View>
        </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    skipButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        zIndex: 1,
    },
    skipText: {
        fontSize: 16,
        color: '#007AFF',
        fontWeight: '600',
    },
    slide: {
        width,
        height,
        alignItems: 'center',
        padding: 20,
    },
    image: {
        width: width * 0.8,
        height: height * 0.4,
        resizeMode: 'contain',
        marginTop: height * 0.1,
    },
    textContainer: {
        flex: 0.3,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 10,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 24,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
    },
    pagination: {
        flexDirection: 'row',
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        height: 10,
        borderRadius: 5,
        backgroundColor: '#007AFF',
        marginHorizontal: 4,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 12,
        marginTop: 20,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
    },
    buttonIcon: {
        marginLeft: 8,
    },
});

export default OnboardingScreen;

