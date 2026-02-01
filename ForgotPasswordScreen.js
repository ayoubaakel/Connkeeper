import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

const ForgotPasswordScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async () => {
        if (!email) {
            Alert.alert(
                'Missing Email',
                'Please enter your email address to receive password reset instructions',
                [{ text: 'OK', style: 'default' }]
            );
            return;
        }

        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            Alert.alert(
                'Reset Link Sent',
                'Check your email inbox for instructions to reset your password. Don\'t forget to check your spam folder.',
                [{ text: 'OK', onPress: () => navigation.navigate('SignIn') }]
            );
        } catch (error) {
            let errorMessage = 'An unexpected error occurred';
            
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage = 'Please enter a valid email address';
                    break;
                case 'auth/user-not-found':
                    errorMessage = 'No account found with this email. Please check the email or create a new account.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many attempts. Please try again later';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your internet connection';
                    break;
            }

            Alert.alert(
                'Reset Failed',
                errorMessage,
                [
                    { 
                        text: 'Try Again',
                        style: 'default'
                    },
                    error.code === 'auth/user-not-found' ? {
                        text: 'Create Account',
                        onPress: () => navigation.navigate('SignUp'),
                        style: 'cancel'
                    } : null
                ].filter(Boolean)
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton} 
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Reset Password</Text>
                <Text style={styles.subtitle}>
                    Enter your email address and we'll send you instructions to reset your password
                </Text>
            </View>

            <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#666"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoFocus={true}
                    />
                </View>

                <TouchableOpacity 
                    style={[styles.resetButton, loading && styles.disabledButton]}
                    onPress={handleResetPassword}
                    disabled={loading}
                >
                    <Text style={styles.resetButtonText}>
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity 
                    style={styles.footerButton}
                    onPress={() => navigation.navigate('SignIn')}
                >
                    <Ionicons name="arrow-back" size={20} color="#007AFF" />
                    <Text style={styles.footerButtonText}>Back to Sign In</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    backButton: {
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        lineHeight: 24,
    },
    formContainer: {
        paddingHorizontal: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        marginBottom: 24,
        paddingHorizontal: 16,
        height: 56,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1A1A1A',
    },
    resetButton: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
    },
    disabledButton: {
        backgroundColor: '#A0A0A0',
    },
    resetButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    footerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    footerButtonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default ForgotPasswordScreen;
