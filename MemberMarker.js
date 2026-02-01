import React from 'react';
import { View, Text, Image } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { TouchableOpacity } from 'react-native';

export const MemberMarker = ({ member, navigation, styles }) => (
    <Marker
        key={member.id}
        coordinate={{
            latitude: member.currentLocation.latitude,
            longitude: member.currentLocation.longitude,
        }}
    >
        <View style={styles.markerContainer}>
            <Image 
                source={require('../assets/user.png')} 
                style={styles.markerImage} 
            />
            <Text style={styles.markerName}>{member.name}</Text>
        </View>
        <Callout>
            <View style={styles.calloutContainer}>
                <Text style={styles.calloutName}>{member.name}</Text>
                <Text style={styles.calloutInfo}>
                    Last updated: {member.updatedAt?.toDate().toLocaleTimeString()}
                </Text>
                <TouchableOpacity 
                    style={styles.calloutButton}
                    onPress={() => navigation.navigate('MemberDetails', { memberId: member.id })}
                >
                    <Text style={styles.calloutButtonText}>View Details</Text>
                </TouchableOpacity>
            </View>
        </Callout>
    </Marker>
);