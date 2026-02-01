// components/OnboardingSlide.js
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';

const OnboardingSlide = ({ title, description, icon, button, onPress }) => {
    return (
        <View style={styles.slide}>
            <Ionicons name={icon} size={100} color="#007AFF" />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
            {button && (
                <Button
                    title="Get Started"
                    onPress={onPress}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    slide: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        width: Dimensions.get('window').width,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 20,
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 10,
        width: 300,
        padding: 30,
    },
});

export default OnboardingSlide;
