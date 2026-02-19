import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import Colors from '@/theme/colors';

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signup } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const [loading, setLoading] = useState(false);

  const EMAIL_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;

  const validateEmail = (value: string): string => {
    if (!value.trim()) return '';
    if (!EMAIL_REGEX.test(value.trim())) return 'Enter a valid email (e.g. user@example.com)';
    return '';
  };

  const validatePassword = (value: string): string => {
    if (!value) return '';
    const missing: string[] = [];
    if (value.length < 8) missing.push('at least 8 characters');
    if (!/[A-Z]/.test(value)) missing.push('an uppercase letter');
    if (!/[a-z]/.test(value)) missing.push('a lowercase letter');
    if (!/[0-9]/.test(value)) missing.push('a number');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(value)) missing.push('a special character');
    if (missing.length === 0) return '';
    return 'Password needs ' + missing.join(', ');
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setFieldErrors(prev => ({ ...prev, email: validateEmail(value) }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setFieldErrors(prev => ({
      ...prev,
      password: validatePassword(value),
      confirmPassword: confirmPassword && value !== confirmPassword ? 'Passwords do not match' : '',
    }));
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    setFieldErrors(prev => ({
      ...prev,
      confirmPassword: value && value !== password ? 'Passwords do not match' : '',
    }));
  };

  const handleSignUp = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    const emailErr = validateEmail(email);
    const pwErr = validatePassword(password);
    const confirmErr = password !== confirmPassword ? 'Passwords do not match' : '';
    if (emailErr || pwErr || confirmErr) {
      setFieldErrors({ email: emailErr, password: pwErr, confirmPassword: confirmErr });
      return;
    }
    setLoading(true);
    try {
      const success = await signup(name.trim(), email.trim(), password);
      if (success) {
        router.replace('/(tabs)');
      } else {
        setError('An account with this email already exists.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.gradient, { backgroundColor: Colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Platform.OS === 'web' ? 67 : insets.top + 24,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join NextUp today</Text>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, fieldErrors.email ? styles.inputFieldError : null]}
            placeholder="Email"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={handleEmailChange}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {fieldErrors.email ? <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text> : null}
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, fieldErrors.password ? styles.inputFieldError : null]}
            placeholder="Password"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={handlePasswordChange}
            secureTextEntry
          />
          {fieldErrors.password ? <Text style={styles.fieldErrorText}>{fieldErrors.password}</Text> : null}
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, fieldErrors.confirmPassword ? styles.inputFieldError : null]}
            placeholder="Confirm Password"
            placeholderTextColor={Colors.textMuted}
            value={confirmPassword}
            onChangeText={handleConfirmPasswordChange}
            secureTextEntry
          />
          {fieldErrors.confirmPassword ? <Text style={styles.fieldErrorText}>{fieldErrors.confirmPassword}</Text> : null}
        </View>

        <TouchableOpacity
          onPress={handleSignUp}
          disabled={loading}
          activeOpacity={0.8}
          style={styles.buttonWrapper}
        >
          <View style={[styles.button, { backgroundColor: Colors.gold }]}>
            {loading ? (
              <ActivityIndicator color={Colors.black} />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          style={styles.linkContainer}
        >
          <Text style={styles.linkText}>
            Already have an account?{' '}
            <Text style={styles.linkHighlight}>Login</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  logoImage: {
    width: 140,
    height: 140,
  },
  title: {
    fontSize: 28,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  errorContainer: {
    backgroundColor: Colors.dangerBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.danger,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    color: Colors.text,
  },
  inputFieldError: {
    borderColor: Colors.danger,
  },
  fieldErrorText: {
    color: Colors.danger,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  buttonWrapper: {
    marginTop: 8,
  },
  button: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: Colors.black,
    fontSize: 17,
    fontFamily: 'DMSans_600SemiBold',
  },
  linkContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
  },
  linkHighlight: {
    color: Colors.gold,
    fontFamily: 'DMSans_600SemiBold',
  },
});
