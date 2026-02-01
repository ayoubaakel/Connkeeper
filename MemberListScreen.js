import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { firestore, auth } from '../config/firebase';
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { Swipeable } from 'react-native-gesture-handler';
import RBSheet from 'react-native-raw-bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from '../components/SearchBar';
import { format } from 'date-fns';

const MemberListScreen = ({ navigation }) => {
    const [members, setMembers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredMembers, setFilteredMembers] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const refRBSheet = useRef();

    const fetchMembers = async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            const q = query(collection(firestore, "members"), where("inviterUserId", "==", currentUser.uid));
            const querySnapshot = await getDocs(q);
            const membersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            setMembers(membersList);
            setFilteredMembers(membersList);
        } catch (error) {
            console.error("Error fetching members:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const handleDeleteMember = async (id) => {
        try {
            await deleteDoc(doc(firestore, "members", id));
            const updatedMembers = members.filter(member => member.id !== id);
            setMembers(updatedMembers);
            setFilteredMembers(updatedMembers);
        } catch (error) {
            console.error("Error deleting member:", error);
        }
    };

    const formatUpdatedTime = (timestamp) => {
        try {
            if (!timestamp) return '';
            if (timestamp.toDate && typeof timestamp.toDate === 'function') {
                return format(timestamp.toDate(), 'hh:mm a');
            }
            return format(new Date(timestamp), 'hh:mm a');
        } catch (error) {
            return '';
        }
    };

    const renderItem = ({ item }) => (
        <Swipeable renderRightActions={() => (
            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteMember(item.id)}
            >
                <Ionicons name="trash-outline" size={24} color="white" />
            </TouchableOpacity>
        )}>
            <TouchableOpacity
                style={styles.memberContainer}
                onPress={() => navigation.navigate('MemberDetails', { memberId: item.id })}
            >
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>
                    {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                    </Text>
                </View>
                <View style={styles.memberDetails}>
                    <Text style={styles.memberName}>{item.name || 'Unknown Member'}</Text>
                    {item.updatedAt && (
                        <View style={styles.timeContainer}>
                            <Ionicons name="time-outline" size={14} color="#666" />
                            <Text style={styles.memberTime}>
                            {formatUpdatedTime(item.updatedAt)}
                            </Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        </Swipeable>
    );

    const handleSearch = (text) => {
        setSearchQuery(text);
        setFilteredMembers(members.filter(member =>
            member.name.toLowerCase().includes(text.toLowerCase())
        ));
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchMembers();
        setRefreshing(false);
    };

    return (
        <View style={styles.container}>
            <SearchBar
                value={searchQuery}
                placeholder="Search Members..."
                onChangeText={handleSearch}
            />
            {loading ? (
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredMembers}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#007AFF"
                        />
                    }
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            )}
            <TouchableOpacity
                style={styles.plusButton}
                onPress={() => navigation.navigate('InviteScreen')}
            >
                <Ionicons name="add" size={32} color="white" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
        padding: 16,
    },
    listContainer: {
        paddingVertical: 8,
    },
    memberContainer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        marginVertical: 6,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    avatarContainer: {
        width: 45,
        height: 45,
        borderRadius: 23,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    memberDetails: {
        flex: 1,
        paddingLeft: 16,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    memberTime: {
        fontSize: 13,
        color: '#666',
        marginLeft: 4,
    },
    deleteButton: {
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        borderRadius: 12,
        marginVertical: 6,
        marginLeft: 8,
    },
    plusButton: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#007AFF',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
    },
});

export default MemberListScreen;
