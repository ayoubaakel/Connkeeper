import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { auth, firestore } from '../config/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDoc, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationScreen() {
    const [notifications, setNotifications] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const fadeAnim = new Animated.Value(0);

    useEffect(() => {
      const user = auth.currentUser;
      console.log('Current user:', user?.uid);  // Add this log
      // ... existing code ...
  }, []);
  
    const fetchNotifications = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
          collection(firestore, 'notifications'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const notificationData = await Promise.all(snapshot.docs.map(async doc => {
          const data = doc.data();
          let memberName = data.memberName || 'Unknown Member';
          if (data.memberId && !data.memberName) {
              try {
                  const memberRef = doc(firestore, 'members', data.memberId);
                  const memberSnap = await getDoc(memberRef);
                  if (memberSnap.exists()) {
                      memberName = memberSnap.data().name;
                  }
              } catch (error) {
                  console.error('Error fetching member:', error);
              }
          }
          
          return {
              id: doc.id,
              ...data,
              memberName,
              createdAt: data.createdAt?.toDate(),
              isRead: data.isRead || false
          };
      }));
      return notificationData;
  };
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
        const notificationData = await fetchNotifications();
        setNotifications(notificationData || []);
    } catch (error) {
        console.error('Error refreshing notifications:', error);
    } finally {
        setRefreshing(false);
    }
}, []);

useEffect(() => {
  Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
  }).start();

  const user = auth.currentUser;
  if (!user) return;

  const q = query(
      collection(firestore, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
  );

  const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
          console.log('No notifications found');
          setNotifications([]);
          return;
      }

      const notificationData = await Promise.all(snapshot.docs.map(async doc => {
          const data = doc.data();
          let memberName = data.memberName || 'Unknown Member';
          if (data.memberId) {
              try {
                  const memberRef = doc(firestore, 'members', data.memberId);
                  const memberSnap = await getDoc(memberRef);
                  if (memberSnap.exists()) {
                      memberName = memberSnap.data().name;
                  }
              } catch (error) {
                  console.error('Error fetching member:', error);
              }
          }
          
          return {
              id: doc.id,
              ...data,
              memberName,
              createdAt: data.createdAt?.toDate(),
              isRead: data.isRead || false
          };
      }));

      setNotifications(notificationData);
  });

  return () => unsubscribe();
}, []);

    const markAsRead = async (notificationId) => {
        try {
          const notificationRef = doc(firestore, 'notifications', notificationId);
          await updateDoc(notificationRef, {
            isRead: true,
            readAt: new Date()
          });
        } catch (error) {
          console.error('Error marking notification as read:', error);
        }
      };


  const renderItem = ({ item }) => (
    <TouchableOpacity 
      onPress={() => markAsRead(item.id)}
      style={[
        styles.notificationItem,
        !item.isRead && styles.unreadNotification
      ]}
    >
      <View style={styles.iconContainer}>
        <Ionicons 
          name={item.type === 'zone_enter' ? 'enter-outline' : 'exit-outline'} 
          size={24} 
          color={item.isRead ? "#007AFF" : "#FF9500"} 
        />
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <Text style={[
            styles.title,
            !item.isRead && styles.unreadText
          ]}>
            {item.placeName}
          </Text>
          <Text style={styles.time}>{getTimeAgo(item.createdAt)}</Text>
        </View>
        <Text style={styles.memberName}>{item.memberName}</Text>
        <Text style={[
          styles.description,
          !item.isRead && styles.unreadText
        ]}>
          {`${item.type === 'zone_enter' ? 'Entered' : 'Left'} the zone`}
        </Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );


  const getTimeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'zone_enter':
        return 'enter-outline';
      case 'zone_exit':
        return 'exit-outline';
      default:
        return 'notifications-outline';
    }
  };



  return (
    <View style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Notifications</Text>
      <Text style={styles.headerSubtitle}>
        {notifications.filter(n => !n.isRead).length} unread
      </Text>
    </View>
    {notifications.length === 0 ? (
      <View style={styles.emptyContainer}>
        <Ionicons name="notifications-off-outline" size={64} color="#CCCCCC" />
        <Text style={styles.emptyText}>No notifications yet</Text>
      </View>
    ) : (
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    )}
  </View>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  unreadNotification: {
    backgroundColor: '#F8F9FA',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  unreadText: {
    color: '#1A1A1A',
    fontWeight: '700',
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF9500',
  },
  memberName: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
    fontWeight: '500',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FF9500',
    marginTop: 4,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  description: {
    fontSize: 14,
    color: '#666666',
  },
  time: {
    fontSize: 12,
    color: '#999999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999999',
  },
});