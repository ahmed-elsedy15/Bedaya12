
"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '@/lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signingIn: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // مراقبة حالة المستخدم بشكل مستمر
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      // بمجرد تغير الحالة، نغلق مؤشر التحميل الخاص بتسجيل الدخول
      setSigningIn(false);
    }, (error) => {
      console.error("Auth state change error:", error);
      setLoading(false);
      setSigningIn(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    if (signingIn) return;
    
    setSigningIn(true);
    try {
      // محاولة تسجيل الدخول
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        toast({
          title: "تم تسجيل الدخول",
          description: `أهلاً بك ${result.user.displayName}`,
        });
      }
    } catch (error: any) {
      console.error("Login failed detailed error:", error);
      
      // تجاهل الخطأ إذا قام المستخدم بإغلاق النافذة بنفسه
      if (error.code === 'auth/popup-closed-by-user') {
        setSigningIn(false);
        return;
      }
      
      // رسالة توضيحية لنوع الخطأ
      let errorMessage = "حدث خطأ غير متوقع. حاول مرة أخرى.";
      if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = "تم إلغاء طلب تسجيل الدخول بسبب فتح نافذة أخرى.";
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = "قام المتصفح بحظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.";
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = "طريقة تسجيل الدخول هذه غير مفعلة في إعدادات Firebase.";
      }
      
      toast({
        title: "خطأ في تسجيل الدخول",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      // تأمين إعادة تعيين الحالة مهما حدث
      setSigningIn(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "تم تسجيل الخروج",
        description: "تم تسجيل الخروج بنجاح.",
      });
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signingIn, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
