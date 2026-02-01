import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { auth } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

const EmailVerificationScreen = ({ navigation }) => {
    const [timeLeft, setTimeLeft] = useState(60);

    useEffect(() => {
        if (timeLeft > 0) {
            const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timerId);
        }
    }, [timeLeft]);

    const handleResendEmail = async () => {
        try {
            await auth.currentUser.sendEmailVerification();
            setTimeLeft(60);
            Alert.alert('Success', 'Verification email has been resent');
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    return (
        <View style={styles.container}>
            <Ionicons name="mail" size={80} color="#007AFF" />
            <Text style={styles.title}>Verify your email</Text>
            <Text style={styles.description}>
                We've sent a verification email to your inbox. Please verify your email address to continue.
            </Text>
            
            <TouchableOpacity 
                style={[styles.resendButton, timeLeft > 0 && styles.disabledButton]}
                onPress={handleResendEmail}
                disabled={timeLeft > 0}
            >
                <Text style={styles.resendButtonText}>
                    {timeLeft > 0 ? `Resend email (${timeLeft}s)` : 'Resend email'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.signInButton}
                onPress={() => navigation.navigate('SignIn')}
            >
                <Text style={styles.signInButtonText}>Back to Sign In</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: '#F8F9FA',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginTop: 24,
        marginBottom: 12,
        color: '#1A1A1A',
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        color: '#666',
        marginBottom: 32,
    },
    resendButton: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 32,
        width: '100%',
        alignItems: 'center',
        marginBottom: 16,
    },
    disabledButton: {
        backgroundColor: '#A0A0A0',
    },
    resendButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    signInButton: {
        paddingVertical: 16,
    },
    signInButtonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default EmailVerificationScreen;