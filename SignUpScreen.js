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
    ScrollView,
    ActivityIndicator
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';


// Add email validation function
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Add password validation function
const isValidPassword = (password) => {
    return password.length >= 8;
};

const SignUpScreen = ({ navigation }) => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    // Add this function after the existing state declarations
const handleLinkPress = (type) => {
    switch(type) {
        case 'terms':
            navigation.navigate('LegalScreen', { initialTab: 'terms' });
            break;
        case 'privacy':
            navigation.navigate('LegalScreen', { initialTab: 'privacy' });
            break;
        case 'data':
            navigation.navigate('LegalScreen', { initialTab: 'data' });
            break;
    }
};

    const handleSignUp = async () => {
        if (!acceptedTerms) {
            Alert.alert(
                'Terms & Conditions',
                'Please accept our terms and conditions to create your account',
                [{ text: 'OK', style: 'default' }]
            );
            return;
        }

        if (!fullName || !email || !password || !confirmPassword) {
            Alert.alert(
                'Missing Information',
                'Please fill in all required fields to create your account',
                [{ text: 'OK', style: 'default' }]
            );
            return;
        }

        if (!isValidEmail(email)) {
            Alert.alert('Invalid Email', 'Please enter a valid email address');
            return;
        }

        if (!isValidPassword(password)) {
            Alert.alert('Weak Password', 'Password must be at least 8 characters long');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert(
                'Password Mismatch',
                'The passwords you entered do not match. Please try again',
                [{ text: 'OK', style: 'default' }]
            );
            return;
        }

        setLoading(true);
        try {
            // First create the authentication user
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

             // Create user document
             await setDoc(doc(firestore, 'users', user.uid), {
                uid: user.uid,
                fullName,
                email,
                createdAt: new Date(),
                shareLocation: true, // Default location sharing setting
            });
            
            try {
               // Create user document
             await setDoc(doc(firestore, 'users', user.uid), {
                uid: user.uid,
                fullName,
                email,
                createdAt: new Date(),
                shareLocation: true, // Default location sharing setting
            });

               
             // Create member document
             await setDoc(doc(firestore, 'members', user.uid), {
                userId: user.uid,
                name: fullName,
                email,
                createdAt: new Date(),
                currentLocation: null,
                lastActive: new Date(),
            });

            // Navigate to HomeScreen after successful signup
                navigation.replace('MainTabs');
            } catch (firestoreError) {
                console.error('Firestore Error:', firestoreError);
                Alert.alert(
                    'Account Setup Incomplete',
                    'Your account was created but we encountered an error saving your profile. Please try signing in again.',
                    [
                        {
                            text: 'Go to Sign In',
                            onPress: () => navigation.navigate('SignIn'),
                            style: 'default'
                        }
                    ]
                );
            }
           
          

        } catch (authError) {
            let errorMessage = 'An unexpected error occurred';
            let actions = [];

            switch (authError.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'This email is already registered';
                    actions = [
                        {
                            text: 'Sign In Instead',
                            onPress: () => navigation.navigate('SignIn'),
                            style: 'default'
                        },
                        {
                            text: 'Try Different Email',
                            style: 'cancel'
                        }
                    ];
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Please enter a valid email address';
                    actions = [{ text: 'OK', style: 'default' }];
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password should be at least 6 characters long';
                    actions = [{ text: 'OK', style: 'default' }];
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your internet connection';
                    actions = [{ text: 'Try Again', style: 'default' }];
                    break;
                default:
                    actions = [{ text: 'Try Again', style: 'default' }];
            }

            Alert.alert('Sign Up Failed', errorMessage, actions);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={styles.backButton} 
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#007AFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Create Account</Text>
                    <Text style={styles.subtitle}>Join our community today</Text>
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.inputContainer}>
                        <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            placeholderTextColor="#666"
                            value={fullName}
                            onChangeText={setFullName}
                        />
                    </View>

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
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor="#666"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity 
                            onPress={() => setShowPassword(!showPassword)}
                            style={styles.eyeIcon}
                        >
                            <Ionicons 
                                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                                size={20} 
                                color="#666" 
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Confirm Password"
                            placeholderTextColor="#666"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showPassword}
                        />
                    </View>

                    <TouchableOpacity 
            style={[styles.signUpButton, loading && styles.disabledButton]}
            onPress={handleSignUp}
            disabled={loading}
        >
            {loading ? (
                <ActivityIndicator color="#FFFFFF" />
            ) : (
                <Text style={styles.signUpButtonText}>Sign Up</Text>
            )}
        </TouchableOpacity>

                    <View style={styles.termsContainer}>
    <TouchableOpacity 
        style={styles.checkboxContainer} 
        onPress={() => setAcceptedTerms(!acceptedTerms)}
    >
        <Ionicons 
            name={acceptedTerms ? "checkbox" : "square-outline"} 
            size={24} 
            color="#007AFF" 
        />
        <Text style={styles.checkboxLabel}>By proceeding to create your account, you agree to our </Text>
    </TouchableOpacity>
    <View style={styles.termsLinksContainer}>
        <TouchableOpacity onPress={() => handleLinkPress('terms')}>
            <Text style={styles.linkText}>Terms of Service</Text>
        </TouchableOpacity>
        <Text style={styles.checkboxLabel}>, </Text>
        <TouchableOpacity onPress={() => handleLinkPress('privacy')}>
            <Text style={styles.linkText}>Privacy Policy</Text>
        </TouchableOpacity>
        <Text style={styles.checkboxLabel}>, and </Text>
        <TouchableOpacity onPress={() => handleLinkPress('data')}>
            <Text style={styles.linkText}>Data Usage Policy</Text>
        </TouchableOpacity>
    </View>
</View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Already have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                        <Text style={styles.signInText}>Sign In</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 24,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    backButton: {
        marginBottom: 16,
    },
    termsContainer: {
        marginTop: 16,
        paddingHorizontal: 5,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    checkboxLabel: {
        fontSize: 14,
        color: '#666',
        marginLeft: 5,
    },
    termsLinksContainer: {
        flexDirection: 'row',

    },
    linkText: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
    formContainer: {
        paddingHorizontal: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        marginBottom: 16,
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
    eyeIcon: {
        padding: 8,
    },
    signUpButton: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
    },
    disabledButton: {
        backgroundColor: '#A0A0A0',
    },
    signUpButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    termsText: {
        textAlign: 'center',
        color: '#666',
        fontSize: 12,
        marginTop: 16,
        paddingHorizontal: 32,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 32,
    },
    footerText: {
        fontSize: 14,
        color: '#666',
    },
    signInText: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '600',
    },
});

export default SignUpScreen;
