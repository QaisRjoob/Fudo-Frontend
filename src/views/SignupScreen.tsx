import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthService } from '../services/AuthService';
import { useRouter } from 'expo-router';

export default function SignupScreen() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();
  const router = useRouter();

  const textColor = colorScheme === 'dark' ? '#FFF' : '#000';
  const backgroundColor = colorScheme === 'dark' ? '#000' : '#FFF';
  const inputBg = colorScheme === 'dark' ? '#1A1A1A' : '#F5F5F5';
  const borderColor = colorScheme === 'dark' ? '#333' : '#E0E0E0';
  const placeholderColor = colorScheme === 'dark' ? '#666' : '#999';

  const validateForm = () => {
    if (!username || !displayName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return false;
    }

    if (!gender) {
      Alert.alert('Error', 'Please select your gender');
      return false;
    }

    if (username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return false;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    const result = await AuthService.signup({
      username,
      displayName,
      email,
      password,
      gender: gender!,
    });
    setLoading(false);

    if (result.success) {
      router.replace('/onboarding');
    } else {
      Alert.alert('Signup Failed', result.error || 'Could not create account');
    }
  };

  const goToLogin = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={goToLogin} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
        </View>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Ionicons name="restaurant" size={50} color="#FF6B35" />
          </View>
          <Text style={[styles.title, { color: textColor }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: placeholderColor }]}>
            Join the Fudo community
          </Text>
        </View>

        {/* Signup Form */}
        <View style={styles.formContainer}>
          <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
            <Ionicons name="person-outline" size={20} color={placeholderColor} />
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="Username"
              placeholderTextColor={placeholderColor}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
            <Ionicons name="person-circle-outline" size={20} color={placeholderColor} />
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="Display Name"
              placeholderTextColor={placeholderColor}
              value={displayName}
              onChangeText={setDisplayName}
              autoCorrect={false}
            />
          </View>

          {/* Gender selector */}
          <View style={styles.genderContainer}>
            <Text style={[styles.genderLabel, { color: placeholderColor }]}>Gender</Text>
            <View style={styles.genderRow}>
              <TouchableOpacity
                style={[
                  styles.genderBtn,
                  { borderColor: gender === 'male' ? '#FF6B35' : borderColor, backgroundColor: gender === 'male' ? '#FF6B35' : inputBg },
                ]}
                onPress={() => setGender('male')}
                activeOpacity={0.8}
              >
                <Ionicons name="male" size={20} color={gender === 'male' ? '#FFF' : placeholderColor} />
                <Text style={[styles.genderBtnText, { color: gender === 'male' ? '#FFF' : textColor }]}>Male</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderBtn,
                  { borderColor: gender === 'female' ? '#FF6B35' : borderColor, backgroundColor: gender === 'female' ? '#FF6B35' : inputBg },
                ]}
                onPress={() => setGender('female')}
                activeOpacity={0.8}
              >
                <Ionicons name="female" size={20} color={gender === 'female' ? '#FFF' : placeholderColor} />
                <Text style={[styles.genderBtnText, { color: gender === 'female' ? '#FFF' : textColor }]}>Female</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
            <Ionicons name="mail-outline" size={20} color={placeholderColor} />
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="Email"
              placeholderTextColor={placeholderColor}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
            <Ionicons name="lock-closed-outline" size={20} color={placeholderColor} />
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="Password"
              placeholderTextColor={placeholderColor}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={placeholderColor}
              />
            </TouchableOpacity>
          </View>

          <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
            <Ionicons name="lock-closed-outline" size={20} color={placeholderColor} />
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="Confirm Password"
              placeholderTextColor={placeholderColor}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons
                name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={placeholderColor}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.signupButton, loading && styles.signupButtonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.signupButtonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <View style={styles.termsContainer}>
            <Text style={[styles.termsText, { color: placeholderColor }]}>
              By signing up, you agree to our{' '}
            </Text>
            <TouchableOpacity>
              <Text style={styles.termsLink}>Terms & Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={[styles.loginText, { color: placeholderColor }]}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={goToLogin}>
            <Text style={styles.loginLink}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  formContainer: {
    width: '100%',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  signupButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  termsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
  },
  termsLink: {
    color: '#FF6B35',
    fontSize: 12,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  genderContainer: {
    marginBottom: 16,
  },
  genderLabel: {
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 4,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
  },
  genderBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
