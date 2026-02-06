import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { createUserProfile } from '../data/supabaseData'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [currentStudentId, setCurrentStudentId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await handleLogin(session.user)
      }
      setIsLoading(false)
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setUserRole(null)
        setCurrentStudentId(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async (authUser, role = null) => {
    setUser(authUser)

    if (role) {
      setUserRole(role)
      if (role === 'student') {
        const { data: studentData } = await supabase
          .from('students')
          .select('id')
          .eq('email', authUser.email)
          .single()
        if (studentData) {
          setCurrentStudentId(studentData.id)
        }
      }
      return
    }

    const { data: studentData } = await supabase
      .from('students')
      .select('id')
      .eq('email', authUser.email)
      .single()

    if (studentData) {
      setUserRole('student')
      setCurrentStudentId(studentData.id)
    } else {
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('id')
        .eq('email', authUser.email)
        .single()

      if (teacherData) {
        setUserRole('teacher')
      } else {
        // New user (likely from OAuth) - check localStorage for selected role
        const signupRole = localStorage.getItem('speakeasy_signup_role')
        localStorage.removeItem('speakeasy_signup_role') // Clean up after use
        
        if (signupRole) {
          // User pre-selected a role before OAuth
          const userName = authUser.user_metadata?.full_name || authUser.email.split('@')[0]
          try {
            const newProfile = await createUserProfile(authUser.email, userName, signupRole)
            setUserRole(signupRole)
            if (signupRole === 'student' && newProfile?.id) {
              setCurrentStudentId(newProfile.id)
            }
          } catch (err) {
            console.error('Failed to create profile for new user:', err)
            setUserRole(signupRole)
          }
        } else {
          // No role selected - need to ask user
          setNeedsRoleSelection(true)
        }
      }
    }
  }

  const completeSignup = async (role) => {
    if (!user) return
    
    const userName = user.user_metadata?.full_name || user.email.split('@')[0]
    try {
      const newProfile = await createUserProfile(user.email, userName, role)
      setUserRole(role)
      setNeedsRoleSelection(false)
      if (role === 'student' && newProfile?.id) {
        setCurrentStudentId(newProfile.id)
      }
    } catch (err) {
      console.error('Failed to create profile:', err)
      // Still set role so user can proceed
      setUserRole(role)
      setNeedsRoleSelection(false)
    }
  }

  const handleLogout = async () => {
    try {
      console.log('Logging out...')
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
        // Force clear state even if signOut API fails
        setUser(null)
        setUserRole(null)
        setCurrentStudentId(null)
      }
    } catch (err) {
      console.error('Logout failed:', err)
      // Force clear state on any error
      setUser(null)
      setUserRole(null)
      setCurrentStudentId(null)
    }
  }

  return (
    <AppContext.Provider value={{
      user,
      userRole,
      currentStudentId,
      isLoading,
      needsRoleSelection,
      handleLogin,
      handleLogout,
      completeSignup
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}
