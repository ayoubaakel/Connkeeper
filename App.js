import React, { useState, useEffect } from "react";
import { AppState, Platform } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { auth, firestore } from "./config/firebase";
import { onAuthStateChanged } from 'firebase/auth';
import { doc, collection, query, where, getDocs, updateDoc, addDoc, getDoc } from 'firebase/firestore';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { AppTrackingTransparency } from 'expo-tracking-transparency';

// Import Screens
import SplashScreen from "./screens/SplashScreen";
import OnboardingScreen from "./screens/OnboardingScreen";
import SignInScreen from "./screens/SignInScreen";
import SignUpScreen from "./screens/SignUpScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import HomeScreen from "./screens/HomeScreen";
import NotificationScreen from "./screens/NotificationScreen";
import SettingsScreen from "./screens/SettingsScreen";
import ProfileScreen from "./components/settings/ProfileScreen";
import AboutScreen from "./components/settings/About";
import AddPlaceScreen from "./components/places/AddPlace";
import InviteScreen from "./components/members/InviteScreen";
import MemberListScreen from "./screens/MemberListScreen";
import MemberDetailsScreen from "./components/members/MemberDetailsScreen";
import ListPlacesScreen from "./screens/ListPlacesScreen";
import PlaceDetailsScreen from "./components/places/PlaceDetailsScreen";
import NotificationSettingsScreen from "./components/settings/NotificationsScreen";
import AccountScreen from "./components/settings/AccountScreen";
import SecurityScreen from "./components/settings/SecurityScreen";
import HelpScreen from "./components/settings/HelpScreen";
import FAQScreen from "./components/settings/FaqSettings";
import ContactSupportScreen from "./components/settings/ContactSupportScreen";
import ReportProblemScreen from "./components/settings/ReportProblemScreen";
import UserGuideScreen from "./components/settings/UserGuideScreen";
import ChangePasswordScreen from "./components/settings/ChangePasswordScreen";
import TwoFactorAuthScreen from "./components/settings/TwoFactorAuthScreen";
import DeleteAccountScreen from "./components/settings/DeleteAccountScreen";
import PersonalInformationScreen from "./components/settings/PersonalInformationScreen";
import LegalScreen from "./components/settings/LegalScreen";

// Constants
const BACKGROUND_LOCATION_TASK = 'background-location-task';
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
let memberZoneState = {};

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const notificationListener = Notifications.addNotificationReceivedListener(notification => {
  console.log('Notification received:', notification);
});

// Consolidated permission requests
const requestPermissions = async () => {
  try {
    // Request notification permissions
    const { status: notificationStatus } = await Notifications.getPermissionsAsync();
    if (notificationStatus !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }

    // Request location permissions
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus === 'granted') {
      await Location.requestBackgroundPermissionsAsync();
    }

    // Request App Tracking Transparency (ATT) permission
    if (Platform.OS === 'ios') {
      const { status: trackingStatus } = await AppTrackingTransparency.getTrackingPermissionsAsync();
      if (trackingStatus === 'not-determined') {
        const { status: newStatus } = await AppTrackingTransparency.requestTrackingPermissionsAsync();
        console.log('ATT permission status:', newStatus);
      } else {
        console.log('ATT already set:', trackingStatus);
      }
    }
  } catch (error) {
    console.error('Error requesting permissions:', error);
  }
};

const handleZoneTransition = async (isEntering, memberId, memberName, placeId, placeName, userId) => {
  const type = isEntering ? 'zone_enter' : 'zone_exit';
  const action = isEntering ? 'entered' : 'left';

  // Check for recent notifications with the same memberId, placeId, and type
  const notificationsRef = collection(firestore, 'notifications');
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

  const q = query(
    notificationsRef,
    where('memberId', '==', memberId),
    where('placeId', '==', placeId),
    where('type', '==', type),
    where('createdAt', '>', fiveMinutesAgo)
  );

  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${isEntering ? 'Welcome In!' : 'Goodbye!'}`,
        body: `${memberName} ${isEntering ? 'just entered' : 'just left'} 📍 ${placeName}`,
        sound: 'default',
        priority: 'high',
        vibrate: [0, 250, 250, 250],
        data: { type, placeId, memberId },
      },
      trigger: null,
    });

    await addDoc(collection(firestore, 'notifications'), {
      userId: userId,
      memberId: memberId,
      placeId: placeId,
      placeName: placeName,
      type: type,
      createdAt: new Date(),
      memberName: memberName,
    });
  }

};




// Background location task
const startBackgroundLocationTask = async () => {
  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

    if (foregroundStatus !== 'granted' || backgroundStatus !== 'granted') {
      console.log('Location permissions denied');
      return;
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 30000,
      distanceInterval: 10,
      foregroundService: {
        notificationTitle: "Location Tracking Active",
        notificationBody: "ConnKeeper is tracking your location",
        notificationColor: "#007AFF"
      },
      showsBackgroundLocationIndicator: true,
      activityType: Location.ActivityType.AutomotiveNavigation,
      pausesUpdatesAutomatically: false
    });
  } catch (error) {
    console.error('Error starting background location:', error);
  }
};


// Define background task
if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.error('Background task error:', error);
      return;
    }
    if (!data) return;
    try {

      const now = Date.now();
      if (global.lastUpdate && (now - global.lastUpdate) < 30000) return;
      global.lastUpdate = now;

      const { locations } = data;
      const location = locations[0];
      const user = auth.currentUser;

      if (!user || !location) return;

      const membersRef = collection(firestore, 'members');
      const q = query(membersRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const memberDoc = querySnapshot.docs[0];
        const memberId = memberDoc.id;

        // Check user's location sharing preference
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));

        if (userDoc.exists() && userDoc.data().shareLocation === true) {
          // Update location as before
          await updateDoc(doc(firestore, 'members', memberId), {
            currentLocation: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              accuracy: location.coords.accuracy,
              heading: location.coords.heading,
              speed: location.coords.speed,
            },
            updatedAt: new Date()
          });

          // Get all places owned by the current user
          const placesRef = collection(firestore, 'places');
          const userPlacesQuery = query(placesRef, where('userid', '==', user.uid));
          const userPlacesSnapshot = await getDocs(userPlacesQuery);


          // For each place owned by the user
          for (const placeDoc of userPlacesSnapshot.docs) {
            const place = placeDoc.data();
            const placeId = placeDoc.id;
            const selectedMembers = place.selectedMembers || [];


            console.log(`Checking place ${place.name} with ${selectedMembers.length} members`);

            // Get all members' current locations
            const membersRef = collection(firestore, 'members');
            const membersQuery = query(membersRef, where('userId', 'in', selectedMembers));
            const membersSnapshot = await getDocs(membersQuery);

            // Check each member's position relative to the place
            for (const memberDoc of membersSnapshot.docs) {
              const member = memberDoc.data();
              const memberId = memberDoc.id;


              if (member.currentLocation) {
                const distance = getDistanceFromLatLonInMeters(
                  member.currentLocation.latitude,
                  member.currentLocation.longitude,
                  place.location.latitude,
                  place.location.longitude
                );

                const zoneKey = `${memberId}-${placeId}`;
                const isInZone = distance <= (place.radius || 100);

                console.log(`Member ${member.name}: distance=${distance}m, inZone=${isInZone}`);

                if (isInZone && !memberZoneState[zoneKey]) {
                  memberZoneState[zoneKey] = true;

                  await handleZoneTransition(true, memberId, member.name, placeId, place.name, user.uid);

                  /*  await addDoc(collection(firestore, 'notifications'), {
                      userId: user.uid,
                      memberId: memberId,
                      placeId: placeId,
                      placeName: place.name,
                      type: 'zone_enter',
                      createdAt: new Date(),
                    }); */
                } else if (!isInZone && memberZoneState[zoneKey]) {
                  memberZoneState[zoneKey] = false;

                  await handleZoneTransition(false, memberId, member.name, placeId, place.name, user.uid);

                  /*  await addDoc(collection(firestore, 'notifications'), {
                      userId: user.uid,
                      memberId: memberId,
                      placeId: placeId,
                      placeName: place.name,
                      type: 'zone_exit',
                      createdAt: new Date(),
                    }); */
                }
              }
            }
          }


        }
      }
    } catch (error) {
      console.error('Background task error:', error);
    }
  });
}




// Helper function to calculate distance between two points
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}


// Bottom Tab Navigation (Main Stack)
const MainTabs = () => (
  <Tab.Navigator
    initialRouteName="Home"
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        const icons = {
          Home: focused ? "home" : "home-outline",
          Places: focused ? "location-sharp" : "location-outline",
          Members: focused ? "people" : "people-outline",
          Notifications: focused ? "notifications" : "notifications-outline",
          Settings: focused ? "settings" : "settings-outline",
        };
        return <Ionicons name={icons[route.name]} size={size} color={color} />;
      },
      tabBarLabel: "",
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
    <Tab.Screen name="Places" component={ListPlacesScreen} options={{ headerShown: false }} />
    <Tab.Screen name="Members" component={MemberListScreen} />
    <Tab.Screen name="Notifications" component={NotificationScreen} options={{ headerShown: false }} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
);

// Authentication Stack (SignIn, SignUp, Forgot Password)
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SignIn" component={SignInScreen} />
    <Stack.Screen name="SignUp" component={SignUpScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </Stack.Navigator>
);

// Main App component
export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState("Splash");
  const [user, setUser] = useState(null);
  const [userToken, setUserToken] = useState(null);
  const [isSplashComplete, setIsSplashComplete] = useState(false);

  useEffect(() => {
    // Set up notification listener
    const notificationSubscription = notificationListener;

    return () => {
      notificationSubscription.remove();
    };
  }, []);


  useEffect(() => {
    async function configurePushNotifications() {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }

      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    }

    configurePushNotifications();
  }, []);

  // Initialize permissions
  useEffect(() => {
    requestPermissions();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        requestPermissions();
      }
    });

    return () => {
      if (subscription?.remove) {
        subscription.remove();
      }
    };
  }, []);

  // Location update function
  const updateUserLocation = async (user) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});

      // Get all places owned by the current user
      const placesRef = collection(firestore, 'places');
      const userPlacesQuery = query(placesRef, where('userid', '==', user.uid));
      const userPlacesSnapshot = await getDocs(userPlacesQuery);


      // For each place owned by the user
      for (const placeDoc of userPlacesSnapshot.docs) {
        const place = placeDoc.data();
        const placeId = placeDoc.id;
        const selectedMembers = place.selectedMembers || [];


        console.log(`Checking place ${place.name} with ${selectedMembers.length} members`);

        // Get all members' current locations
        const membersRef = collection(firestore, 'members');
        const membersQuery = query(membersRef, where('userId', 'in', selectedMembers));
        const membersSnapshot = await getDocs(membersQuery);

        // Check each member's position relative to the place
        for (const memberDoc of membersSnapshot.docs) {
          const member = memberDoc.data();
          const memberId = memberDoc.id;


          if (member.currentLocation) {
            const distance = getDistanceFromLatLonInMeters(
              member.currentLocation.latitude,
              member.currentLocation.longitude,
              place.location.latitude,
              place.location.longitude
            );

            const zoneKey = `${memberId}-${placeId}`;
            const isInZone = distance <= (place.radius || 100);

            console.log(`Member ${member.name}: distance=${distance}m, inZone=${isInZone}`);

            if (isInZone && !memberZoneState[zoneKey]) {
              memberZoneState[zoneKey] = true;

              await handleZoneTransition(true, memberId, member.name, placeId, place.name, user.uid);

              /*  await addDoc(collection(firestore, 'notifications'), {
                  userId: user.uid,
                  memberId: memberId,
                  placeId: placeId,
                  placeName: place.name,
                  type: 'zone_enter',
                  createdAt: new Date(),
                }); */
            } else if (!isInZone && memberZoneState[zoneKey]) {
              memberZoneState[zoneKey] = false;

              await handleZoneTransition(false, memberId, member.name, placeId, place.name, user.uid);

              /* await addDoc(collection(firestore, 'notifications'), {
                 userId: user.uid,
                 memberId: memberId,
                 placeId: placeId,
                 placeName: place.name,
                 type: 'zone_exit',
                 createdAt: new Date(),
               }); */
            }
          }
        }
      }



      const membersRef = collection(firestore, 'members');
      const q = query(membersRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const memberDoc = querySnapshot.docs[0];
        await updateDoc(doc(firestore, 'members', memberDoc.id), {
          currentLocation: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          updatedAt: new Date()
        });


      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  // Auth state and splash screen handler
  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setIsSplashComplete(true);
    }, 2000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        const hasOpenedBefore = await AsyncStorage.getItem("hasOpenedBefore");

        if (user) {
          await updateUserLocation(user);
          await startBackgroundLocationTask();
          const locationInterval = setInterval(() => {
            updateUserLocation(user);
          }, 30000);

          setUser(user);
          setUserToken(user.uid);
          setInitialRoute("MainTabs");

          return () => {
            clearInterval(locationInterval);
            Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
              .catch(error => console.log('Error stopping location updates:', error));
          };
        } else {
          setUserToken(null);
          setUser(null);
          setInitialRoute(hasOpenedBefore ? "Auth" : "Onboarding");
        }

        if (!hasOpenedBefore) {
          await AsyncStorage.setItem("hasOpenedBefore", "true");
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
        setInitialRoute("Auth");
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      clearTimeout(splashTimer);
      unsubscribe();
    };
  }, []);

  if (isLoading || !isSplashComplete) {
    return <SplashScreen />;
  }



  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Auth" component={AuthStack} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
        <Stack.Screen name="AddPlace" component={AddPlaceScreen} />
        <Stack.Screen name="InviteScreen" component={InviteScreen} />
        <Stack.Screen name="MemberDetails" component={MemberDetailsScreen} />
        <Stack.Screen name="PlaceDetails" component={PlaceDetailsScreen} />
        <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
        <Stack.Screen name="AccountSettings" component={AccountScreen} />
        <Stack.Screen name="SecuritySettings" component={SecurityScreen} />
        <Stack.Screen name="HelpSettings" component={HelpScreen} />
        <Stack.Screen name="FaqSettings" component={FAQScreen} />
        <Stack.Screen name="ContactSupport" component={ContactSupportScreen} />
        <Stack.Screen name="ReportProblem" component={ReportProblemScreen} />
        <Stack.Screen name="UserGuide" component={UserGuideScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="TwoFactorAuth" component={TwoFactorAuthScreen} />
        <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
        <Stack.Screen name="PersonalInformation" component={PersonalInformationScreen} />
        <Stack.Screen name="LegalScreen" component={LegalScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
