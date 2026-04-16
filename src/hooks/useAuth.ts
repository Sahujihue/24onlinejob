import { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, async (snapshot) => {
      const isAdminEmail = user.email === 'prsahu5700@gmail.com';
      
      if (snapshot.exists()) {
        const data = snapshot.data() as UserProfile;
        setProfile(data);
        
        // If it's the admin email but role is 'user', update it to 'admin'
        if (isAdminEmail && data.role !== 'admin') {
          await updateDoc(userDocRef, { role: 'admin' });
        }
      } else {
        // Create profile if it doesn't exist
        const isAdminEmail = user.email === 'prsahu5700@gmail.com';
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          role: isAdminEmail ? 'admin' : 'user',
          savedJobs: [],
          createdAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, {
          ...newProfile,
          createdAt: serverTimestamp(),
        });
      }
      setLoading(false);
    }, (error) => {
      console.error('Firestore Error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { user, profile, loading, logout };
}
