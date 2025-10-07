# Push Notification Implementation Guide for Flutter App

## Overview
The backend is now configured to send push notifications when a patient account is approved. This guide explains how to set up the Flutter app to receive these notifications.

---

## Backend Implementation (✅ Already Done)

### What's Implemented:
1. **Notification Service** (`utils/notificationService.js`)
   - Sends FCM push notifications
   - Handles different notification types
   - Includes error handling for invalid tokens

2. **Account Approval Notification**
   - Automatically sent when admin approves a patient
   - Includes patient name and welcome message
   - Contains navigation data to home screen

3. **Notification Types Available:**
   - `account_approval` - When account is approved
   - `appointment_reminder` - For upcoming appointments
   - `reschedule_approval` - When reschedule request is approved
   - `general` - For any custom notifications

---

## Flutter App Setup (Required)

### Step 1: Add Firebase to Flutter App

1. **Add dependencies** to `pubspec.yaml`:
```yaml
dependencies:
  firebase_core: ^2.24.2
  firebase_messaging: ^14.7.9
  flutter_local_notifications: ^16.3.0
```

2. **Run:**
```bash
flutter pub get
```

### Step 2: Configure Firebase in Flutter

**In `main.dart`:**
```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

// Background message handler (must be top-level function)
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('Handling background message: ${message.messageId}');
  print('Title: ${message.notification?.title}');
  print('Body: ${message.notification?.body}');
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  await Firebase.initializeApp();
  
  // Set up background message handler
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  
  runApp(MyApp());
}
```

### Step 3: Create Notification Service in Flutter

Create `lib/services/notification_service.dart`:

```dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  String? _deviceToken;
  String? get deviceToken => _deviceToken;

  // Initialize notification service
  Future<void> initialize() async {
    // Request permission
    NotificationSettings settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    print('Notification permission status: ${settings.authorizationStatus}');

    // Initialize local notifications (for Android)
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();
    
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (details) {
        _handleNotificationTap(details.payload);
      },
    );

    // Create notification channel for Android
    const androidChannel = AndroidNotificationChannel(
      'dialyease_notifications',
      'DialyEase Notifications',
      description: 'Important notifications from DialyEase',
      importance: Importance.high,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(androidChannel);

    // Get device token
    _deviceToken = await _fcm.getToken();
    print('🔑 FCM Device Token: $_deviceToken');

    // Listen for token refresh
    _fcm.onTokenRefresh.listen((newToken) {
      _deviceToken = newToken;
      print('🔄 FCM Token refreshed: $newToken');
      _sendTokenToBackend(newToken);
    });

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // Handle notification tap when app is in background
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageOpened);

    // Check if app was opened from a notification
    RemoteMessage? initialMessage = await _fcm.getInitialMessage();
    if (initialMessage != null) {
      _handleMessageOpened(initialMessage);
    }
  }

  // Send device token to backend
  Future<void> _sendTokenToBackend(String token) async {
    try {
      // Replace with your actual backend URL and patient ID
      final patientId = 'YOUR_PATIENT_ID'; // Get from auth/storage
      final response = await http.post(
        Uri.parse('YOUR_BACKEND_URL/api/patients/device-token'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'patientId': patientId,
          'deviceToken': token,
        }),
      );
      
      if (response.statusCode == 200) {
        print('✅ Device token sent to backend');
      }
    } catch (e) {
      print('❌ Error sending token to backend: $e');
    }
  }

  // Handle foreground messages
  void _handleForegroundMessage(RemoteMessage message) {
    print('📱 Foreground message received:');
    print('Title: ${message.notification?.title}');
    print('Body: ${message.notification?.body}');
    print('Data: ${message.data}');

    // Show local notification
    _showLocalNotification(message);
  }

  // Show local notification
  Future<void> _showLocalNotification(RemoteMessage message) async {
    final notification = message.notification;
    final android = message.notification?.android;

    if (notification != null) {
      await _localNotifications.show(
        notification.hashCode,
        notification.title,
        notification.body,
        NotificationDetails(
          android: AndroidNotificationDetails(
            'dialyease_notifications',
            'DialyEase Notifications',
            channelDescription: 'Important notifications from DialyEase',
            importance: Importance.high,
            priority: Priority.high,
            icon: android?.smallIcon ?? '@mipmap/ic_launcher',
          ),
          iOS: const DarwinNotificationDetails(),
        ),
        payload: jsonEncode(message.data),
      );
    }
  }

  // Handle notification tap
  void _handleMessageOpened(RemoteMessage message) {
    print('📱 Notification tapped!');
    print('Data: ${message.data}');
    
    final data = message.data;
    final notificationType = data['type'];
    
    // Navigate based on notification type
    switch (notificationType) {
      case 'account_approval':
        // Navigate to home screen
        // Navigator.pushNamed(context, '/home');
        break;
      case 'appointment_reminder':
        // Navigate to appointments
        // Navigator.pushNamed(context, '/appointments');
        break;
      case 'reschedule_approval':
        // Navigate to appointments
        // Navigator.pushNamed(context, '/appointments');
        break;
      default:
        // Default navigation
        break;
    }
  }

  // Handle notification tap from local notification
  void _handleNotificationTap(String? payload) {
    if (payload != null) {
      final data = jsonDecode(payload);
      print('Local notification tapped: $data');
      // Handle navigation
    }
  }

  // Send token after user login/registration
  Future<void> sendTokenToBackend(String patientId, String baseUrl) async {
    if (_deviceToken == null) {
      print('⚠️ No device token available');
      return;
    }

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/patients/device-token'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'patientId': patientId,
          'deviceToken': _deviceToken,
        }),
      );

      if (response.statusCode == 200) {
        print('✅ Device token registered successfully');
      } else {
        print('❌ Failed to register device token: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Error sending device token: $e');
    }
  }
}
```

### Step 4: Initialize in Your App

**Update `main.dart`:**
```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  
  // Initialize notification service
  await NotificationService().initialize();
  
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  
  runApp(MyApp());
}
```

### Step 5: Send Token After Login/Registration

**In your login/registration success handler:**
```dart
// After successful login or registration
final notificationService = NotificationService();
await notificationService.sendTokenToBackend(
  patient.id, // Your patient ID
  'YOUR_BACKEND_URL', // e.g., https://dialyease-admin.onrender.com
);
```

---

## Testing Push Notifications

### Test Flow:

1. **Register a new patient** in the Flutter app
2. **Check backend logs** - should see:
   ```
   🔑 Device token saved: [token]
   ```
3. **Go to admin dashboard** and approve the patient
4. **Check backend logs** - should see:
   ```
   ✅ Approval notification sent to [Name]
   ```
5. **Flutter app should receive** the notification

### Debug Steps:

1. **Check if token is generated:**
   ```dart
   print('Device Token: ${NotificationService().deviceToken}');
   ```

2. **Check if token is sent to backend:**
   - Look for "Device token registered successfully" in Flutter console

3. **Check backend logs on Render:**
   - Go to Render dashboard → Your service → Logs
   - Look for "Push notification sent" messages

---

## Notification Data Structure

When a notification is received, it contains:

```json
{
  "notification": {
    "title": "🎉 Account Approved!",
    "body": "Welcome [Name]! Your DialyEase account has been approved..."
  },
  "data": {
    "type": "account_approval",
    "patientId": "123456",
    "patientName": "John Doe",
    "screen": "home",
    "timestamp": "2025-10-07T..."
  }
}
```

---

## Important Notes

### Android:
- ✅ Works out of the box with Firebase setup
- ✅ Notifications shown even when app is closed
- ✅ Custom notification channel for better UX

### iOS:
- ⚠️ Requires Apple Developer Account
- ⚠️ Need to configure APNs certificate in Firebase Console
- ⚠️ Requires physical device for testing (not simulator)

### Backend Token Storage:
- ✅ Already implemented in `patientRoutes.js`
- ✅ Token stored in Patient model `deviceToken` field
- ✅ Route: `POST /api/patients/device-token`

---

## Additional Notification Types You Can Use

The backend also supports:

### 1. Appointment Reminder:
```javascript
sendAppointmentReminder(patient, '2025-10-08');
```

### 2. Reschedule Approval:
```javascript
sendRescheduleApprovalNotification(patient, '2025-10-10');
```

### 3. Custom Notification:
```javascript
sendGeneralNotification(
  patient,
  'Your Title',
  'Your message here',
  { customData: 'value' }
);
```

---

## Troubleshooting

### "No notification received"
1. Check device token is saved in database
2. Verify Firebase is initialized correctly
3. Check notification permissions are granted
4. Look at backend logs for errors

### "Invalid device token" error
- Token may have expired
- User may have reinstalled app
- Backend will log this and you can handle re-registration

### "Firebase not initialized"
- Make sure `Firebase.initializeApp()` is called before any Firebase operations
- Check `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) is added

---

## Next Steps

1. ✅ Backend is ready (already deployed)
2. 📱 Implement Flutter notification service (copy code above)
3. 🧪 Test with a real device
4. 🎨 Customize notification UI
5. 🚀 Deploy and enjoy!

---

## Support

If you encounter issues:
1. Check Firebase Console for delivery status
2. Check Render logs for backend errors
3. Use `print()` statements to debug token flow
4. Test on physical device (especially for iOS)

The backend is all set! Just implement the Flutter side and you'll have working push notifications! 🎉
