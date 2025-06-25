
import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { UserRole, AuthenticatedUser } from '../types';
import * as firebaseService from '../services/firebaseService';

interface AuthContextType {
  currentUser: AuthenticatedUser | null;
  login: (identifier: string, pass: string, roleAttempt?: UserRole) => Promise<boolean>; // identifier can be username or email
  logout: () => void;
  isLoading: boolean;
  updateCurrentUser: (updatedData: Partial<AuthenticatedUser>) => void; // Added
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(() => {
    const storedUser = localStorage.getItem('currentUser');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start true for initial check

  useEffect(() => {
    // This effect ensures that we're done with the initial user loading from localStorage
    setIsLoading(false);
  }, []);
  
  const login = useCallback(async (identifier: string, pass: string, roleAttempt?: UserRole): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await firebaseService.findUserByCredentials(identifier, pass);
      if (result && result.user) {
        if (roleAttempt && result.user.role !== roleAttempt && result.user.role !== UserRole.CLIENT) { 
             console.warn(`Role mismatch: Attempted ${roleAttempt}, actual ${result.user.role}`);
        }

        const authenticatedUser: AuthenticatedUser = {
          ...result.user,
          // parkingLotId is already part of result.user if applicable from findUserByCredentials
        };
        setCurrentUser(authenticatedUser);
        localStorage.setItem('currentUser', JSON.stringify(authenticatedUser));
        return true;
      }
      setCurrentUser(null);
      localStorage.removeItem('currentUser');
      return false;
    } catch (error) {
      console.error("Login error:", error);
      setCurrentUser(null);
      localStorage.removeItem('currentUser');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  }, []);

  const updateCurrentUser = useCallback((updatedData: Partial<AuthenticatedUser>) => {
    setCurrentUser(prevUser => {
      if (!prevUser) return null; // Should not happen if called correctly
      const newUser = { ...prevUser, ...updatedData };
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      return newUser;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, isLoading, updateCurrentUser }}>
      {!isLoading && children} {/* Render children only after initial auth check */}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
