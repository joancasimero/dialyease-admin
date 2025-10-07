const admin = require('firebase-admin');

/**
 * Send push notification to a patient's device
 * @param {string} deviceToken - FCM device token from patient's mobile app
 * @param {object} notification - Notification data
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {object} data - Additional data to send
 */
const sendPushNotification = async (deviceToken, notification, data = {}) => {
  try {
    // Check if Firebase is initialized
    if (!admin.apps || admin.apps.length === 0) {
      console.warn('⚠️ Firebase not initialized. Push notification skipped.');
      return { success: false, reason: 'Firebase not initialized' };
    }

    if (!deviceToken) {
      console.warn('⚠️ No device token provided. Push notification skipped.');
      return { success: false, reason: 'No device token' };
    }

    console.log('📱 Sending push notification to device:', deviceToken.substring(0, 20) + '...');
    console.log('📱 Notification:', notification);

    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...data,
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        timestamp: new Date().toISOString()
      },
      token: deviceToken,
      android: {
        notification: {
          sound: 'default',
          priority: 'high',
          channelId: 'dialyease_notifications'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Push notification sent successfully:', response);
    
    return { 
      success: true, 
      messageId: response,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    
    // Handle specific FCM errors
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      console.warn('⚠️ Invalid or expired device token');
      return { 
        success: false, 
        reason: 'Invalid device token',
        shouldRemoveToken: true 
      };
    }
    
    return { 
      success: false, 
      reason: error.message,
      error: error.code 
    };
  }
};

/**
 * Send account approval notification to patient
 */
const sendAccountApprovalNotification = async (patient) => {
  if (!patient.deviceToken) {
    console.log('📱 Patient has no device token, skipping notification');
    return { success: false, reason: 'No device token' };
  }

  const notification = {
    title: '🎉 Account Approved!',
    body: `Welcome ${patient.firstName}! Your DialyEase account has been approved. You can now book appointments.`
  };

  const data = {
    type: 'account_approval',
    patientId: patient._id.toString(),
    patientName: `${patient.firstName} ${patient.lastName}`,
    screen: 'home' // Navigate to home screen when clicked
  };

  return await sendPushNotification(patient.deviceToken, notification, data);
};

/**
 * Send appointment reminder notification
 */
const sendAppointmentReminder = async (patient, appointmentDate) => {
  if (!patient.deviceToken) {
    return { success: false, reason: 'No device token' };
  }

  const notification = {
    title: '📅 Appointment Reminder',
    body: `Hi ${patient.firstName}, you have a dialysis appointment on ${appointmentDate}. Don't forget!`
  };

  const data = {
    type: 'appointment_reminder',
    patientId: patient._id.toString(),
    appointmentDate: appointmentDate,
    screen: 'appointments'
  };

  return await sendPushNotification(patient.deviceToken, notification, data);
};

/**
 * Send reschedule approval notification
 */
const sendRescheduleApprovalNotification = async (patient, newDate) => {
  if (!patient.deviceToken) {
    return { success: false, reason: 'No device token' };
  }

  const notification = {
    title: '✅ Reschedule Approved',
    body: `Your appointment has been rescheduled to ${newDate}. See you then!`
  };

  const data = {
    type: 'reschedule_approval',
    patientId: patient._id.toString(),
    newDate: newDate,
    screen: 'appointments'
  };

  return await sendPushNotification(patient.deviceToken, notification, data);
};

/**
 * Send general notification to patient
 */
const sendGeneralNotification = async (patient, title, body, additionalData = {}) => {
  if (!patient.deviceToken) {
    return { success: false, reason: 'No device token' };
  }

  const notification = {
    title,
    body
  };

  const data = {
    type: 'general',
    patientId: patient._id.toString(),
    ...additionalData
  };

  return await sendPushNotification(patient.deviceToken, notification, data);
};

/**
 * Send account rejection notification to patient
 */
const sendAccountRejectionNotification = async (patient, reason = '') => {
  try {
    // Check if Firebase is initialized
    if (!admin.apps || admin.apps.length === 0) {
      console.warn('⚠️ Firebase not initialized. Push notification skipped.');
      return { success: false, reason: 'Firebase not initialized' };
    }

    if (!patient.deviceToken) {
      console.warn('⚠️ No device token for patient:', patient.firstName);
      return { success: false, reason: 'No device token' };
    }

    console.log('📱 Sending rejection notification to:', patient.firstName, patient.lastName);

    const message = {
      notification: {
        title: '🔴 Account Denied',
        body: reason 
          ? `Your DialyEase registration was not approved. Reason: ${reason}`
          : `Unfortunately, your DialyEase registration was not approved. Please contact support for more information.`
      },
      data: {
        type: 'account_rejection',
        patientId: patient._id.toString(),
        patientName: `${patient.firstName} ${patient.lastName}`,
        screen: 'login',
        reason: reason || 'Not specified',
        timestamp: new Date().toISOString(),
        clickAction: 'FLUTTER_NOTIFICATION_CLICK'
      },
      token: patient.deviceToken,
      android: {
        notification: {
          sound: 'default',
          priority: 'high',
          channelId: 'dialyease_notifications'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Rejection notification sent to', patient.firstName, patient.lastName);
    console.log('Response:', response);
    
    return { 
      success: true, 
      messageId: response,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error sending rejection notification:', error);
    
    // Handle specific FCM errors
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      console.warn('⚠️ Invalid or expired device token for patient:', patient.firstName);
      return { 
        success: false, 
        reason: 'Invalid device token',
        shouldRemoveToken: true 
      };
    }
    
    return { 
      success: false, 
      reason: error.message,
      error: error.code 
    };
  }
};

module.exports = {
  sendPushNotification,
  sendAccountApprovalNotification,
  sendAppointmentReminder,
  sendRescheduleApprovalNotification,
  sendGeneralNotification,
  sendAccountRejectionNotification
};
